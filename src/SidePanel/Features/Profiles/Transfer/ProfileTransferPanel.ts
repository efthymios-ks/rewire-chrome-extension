import { JsonCodeBlock } from '../../../../Common/Json/JsonCodeBlock';
import { JsonText } from '../../../../Common/Json/JsonText';
import { IMPORT_MODE, type ImportMode } from '../../../../Common/Profiles/Transfer/ImportMode';
import { ProfileTransfer } from '../../../../Common/Profiles/Transfer/ProfileTransfer';
import type { RuleProfile } from '../../../../Contracts/Settings/RuleProfile';
import { copyWithNoticeAsync } from '../../../Core/copyWithNoticeAsync';
import { buildElement } from '../../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../../Core/Dom/ButtonVariants';
import { ConfirmDialog } from '../../../Core/Dom/ConfirmDialog';
import { FormControls } from '../../../Core/Dom/FormControls';
import type { SlidePanel } from '../../../Core/Dom/SlidePanel';
import type { FileClient } from '../../../Core/FileClient';
import { CountText } from '../../../Core/Formatting/CountText';
import type { PanelContext } from '../../Shell/PanelContext';
import { RuleFormatGuide } from './RuleFormatGuide';

const JSON_MIME_TYPE = 'application/json';
const JSON_ACCEPT = '.json,application/json';
const EXPORT_FILE_NAME = 'rewire-profiles.json';
const NOTHING_TICKED_TEXT = 'Tick at least one profile.';

interface ModeChoice {
    mode: ImportMode;
    label: string;
}

const MODE_CHOICES: ModeChoice[] = [
    {
        mode: IMPORT_MODE.Merge,
        label: 'Merge: add new profiles, patch the ones with the same id',
    },
    {
        mode: IMPORT_MODE.Replace,
        label: 'Replace: delete every profile, keep only the imported ones',
    },
];

function summaryOf(profile: RuleProfile): string {
    return `${profile.name} (${CountText.of({
        count: profile.rules.length,
        singular: 'rule',
    })}, ${CountText.of({
        count: profile.variables.length,
        singular: 'variable',
    })})`;
}

interface ProfileChecklistOptions {
    profiles: RuleProfile[];
    selected: Set<string>;
    describe: (profile: RuleProfile) => string;
}

function profileChecklist({ profiles, selected, describe }: ProfileChecklistOptions): HTMLElement {
    return buildElement('div', {
        className: 'profile-checklist',
        attributes: {
            role: 'group',
        },
        children: profiles.map(profile => FormControls.checkbox({
            checked: selected.has(profile.id),
            label: describe(profile),
            onChange: isChecked => {
                if (isChecked) {
                    selected.add(profile.id);

                    return;
                }

                selected.delete(profile.id);
            },
        })),
    });
}

export class ProfileTransferPanel implements SlidePanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _fileClient: FileClient;
    private readonly _exportList: HTMLElement;
    private readonly _preview: HTMLElement;
    private readonly _pasteBox: HTMLTextAreaElement;
    private readonly _exportIds: Set<string>;
    private readonly _importIds = new Set<string>();
    private _shouldIncludeSecrets = false;
    private _mode: ImportMode = IMPORT_MODE.Merge;
    private _pending: RuleProfile[] = [];

    constructor(context: PanelContext, fileClient: FileClient) {
        this._context = context;
        this._fileClient = fileClient;
        const profiles = context.settingsService.current().profiles;
        this._exportIds = new Set(profiles.map(profile => profile.id));
        this._exportList = profileChecklist({ profiles, selected: this._exportIds, describe: summaryOf });
        this._exportList.setAttribute('aria-label', 'Profiles to export');
        this._preview = buildElement('div', {
            className: 'import-preview',
        });
        this._pasteBox = FormControls.textArea({
            value: '',
            rows: 4,
            className: 'input code-input import-paste',
            placeholder: 'Paste profiles JSON',
        });

        this.root = buildElement('div', {
            className: 'transfer-panel',
            children: [
                buildElement('section', {
                    className: 'editor-section',
                    children: [
                        buildElement('h3', {
                            className: 'editor-section-title',
                            text: 'Export',
                        }),
                        this._exportList,
                        FormControls.checkbox({
                            checked: false,
                            label: 'Include cookie values, auth headers and secret variables',
                            onChange: isChecked => {
                                this._shouldIncludeSecrets = isChecked;
                            },
                        }),
                        buildElement('div', {
                            className: 'actions',
                            children: [
                                FormControls.button({
                                    text: 'Copy JSON',
                                    onClick: () => void this.copyProfilesAsync(),
                                }),
                                FormControls.button({
                                    text: 'Download JSON',
                                    variant: BUTTON_VARIANTS.Primary,
                                    onClick: () => this.downloadProfiles(),
                                }),
                            ],
                        }),
                    ],
                }),
                buildElement('section', {
                    className: 'editor-section',
                    children: [
                        buildElement('h3', {
                            className: 'editor-section-title',
                            text: 'Import',
                        }),
                        this._pasteBox,
                        buildElement('div', {
                            className: 'actions',
                            children: [
                                FormControls.button({
                                    text: 'Choose file',
                                    onClick: () => void this.pickFileAsync(),
                                }),
                                FormControls.button({
                                    text: 'Read pasted JSON',
                                    onClick: () => this.readPasted(),
                                }),
                            ],
                        }),
                        this._preview,
                    ],
                }),
                buildElement('section', {
                    className: 'editor-section',
                    children: [
                        buildElement('h3', {
                            className: 'editor-section-title',
                            text: 'Write rules with AI',
                        }),
                        buildElement('p', {
                            className: 'help-text',
                            text: 'Copies how rules are written as JSON, with examples. None of your rules are in it.',
                        }),
                        buildElement('p', {
                            className: 'help-text',
                            text: 'Paste it into an AI chat with what you need, then paste the answer under Import.',
                        }),
                        buildElement('div', {
                            className: 'actions',
                            children: [
                                FormControls.button({
                                    text: 'Copy rule format',
                                    onClick: () => void this.copyRuleFormatAsync(),
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });
    }

    dispose(): void {
        this._pending = [];
    }

    private exportJson(): string | null {
        if (this._exportIds.size === 0) {
            this._context.notifier.show(NOTHING_TICKED_TEXT);

            return null;
        }

        return JsonText.stringify(ProfileTransfer.export({
            settings: this._context.settingsService.current(),
            profileIds: [...this._exportIds],
            shouldIncludeSecrets: this._shouldIncludeSecrets,
        }));
    }

    private downloadProfiles(): void {
        const json = this.exportJson();
        if (json == null) {
            return;
        }

        this._fileClient.download({ text: json, fileName: EXPORT_FILE_NAME, mimeType: JSON_MIME_TYPE });
    }

    private async copyProfilesAsync(): Promise<void> {
        const json = this.exportJson();
        if (json == null) {
            return;
        }

        await copyWithNoticeAsync({
            context: this._context,
            text: json,
            successMessage: 'Profiles JSON copied.',
        });
    }

    private async pickFileAsync(): Promise<void> {
        const picked = await this._fileClient.pickTextAsync(JSON_ACCEPT);
        if (picked.hasErrors) {
            this.showError(picked.error);

            return;
        }

        if (picked.value == null) {
            return;
        }

        this.load(picked.value);
    }

    private readPasted(): void {
        const text = JsonCodeBlock.of(this._pasteBox.value);
        if (text === '') {
            this.showError('Paste the JSON first.');

            return;
        }

        this.load(text);
    }

    private load(text: string): void {
        const parsed = ProfileTransfer.parse(text);
        if (parsed.hasErrors) {
            this.showError(parsed.error);

            return;
        }

        this.showPreview(parsed.value.profiles);
    }

    private async copyRuleFormatAsync(): Promise<void> {
        await copyWithNoticeAsync({
            context: this._context,
            text: RuleFormatGuide.text(),
            successMessage: 'Rule format copied.',
        });
    }

    private showPreview(profiles: RuleProfile[]): void {
        const currentIds = new Set(this._context.settingsService
            .current()
            .profiles
            .map(profile => profile.id));
        this._pending = profiles;
        this._importIds.clear();
        profiles.forEach(profile => this._importIds.add(profile.id));
        this._mode = IMPORT_MODE.Merge;

        const checklist = profileChecklist({
            profiles,
            selected: this._importIds,
            describe: profile => currentIds.has(profile.id)
                ? `${summaryOf(profile)}, same id as yours`
                : summaryOf(profile),
        });
        checklist.setAttribute('aria-label', 'Profiles to import');
        const modeSelect = FormControls.select({
            value: String(this._mode),
            options: MODE_CHOICES.map(choice => ({
                value: String(choice.mode),
                label: choice.label,
            })),
            onChange: value => {
                this._mode = Number(value) as ImportMode;
            },
        });
        modeSelect.setAttribute('aria-label', 'Import mode');

        this._preview.replaceChildren(
            /* nodes: */ checklist,
            /* nodes: */ modeSelect,
            /* nodes: */ FormControls.button({
                text: 'Import',
                variant: BUTTON_VARIANTS.Primary,
                onClick: () => void this.importPendingAsync(),
            }),
        );
    }

    private async importPendingAsync(): Promise<void> {
        const profiles = this._pending.filter(profile => this._importIds.has(profile.id));
        if (profiles.length === 0) {
            this._context.notifier.show(NOTHING_TICKED_TEXT);

            return;
        }

        if (this._mode === IMPORT_MODE.Replace) {
            const confirmed = await ConfirmDialog.askAsync({
                title: 'Replace every profile',
                message: `Delete your ${CountText.of({
                    count: this._context.settingsService.current().profiles.length,
                    singular: 'profile',
                })} and keep only the ${CountText.of({
                    count: profiles.length,
                    singular: 'imported profile',
                })}?`,
                confirmText: 'Replace',
            });
            if (!confirmed) {
                return;
            }
        }

        const imported = await this._context.settingsService.importProfilesAsync(profiles, this._mode);
        if (imported.hasErrors) {
            return;
        }

        this._context.notifier.show(`Imported ${CountText.of({
            count: profiles.length,
            singular: 'profile',
        })}.`);
        this._pending = [];
        this._pasteBox.value = '';
        this._preview.replaceChildren();
    }

    private showError(message: string): void {
        this._preview.replaceChildren(buildElement('p', {
            className: 'form-error',
            text: message,
        }));
    }
}
