import { JsonCodeBlock } from "../../../../Common/Json/JsonCodeBlock";
import { JsonText } from "../../../../Common/Json/JsonText";
import { ImportMode } from "../../../../Common/Profiles/Transfer/ProfileBundle";
import { ProfileTransfer } from "../../../../Common/Profiles/Transfer/ProfileTransfer";
import type { RuleProfile } from "../../../../Contracts/Settings/RuleProfile";
import { ConfirmDialog } from "../../../Core/Dom/ConfirmDialog";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../../Core/Dom/FormControls";
import type { ISlidePanel } from "../../../Core/Dom/ISlidePanel";
import type { IFileClient } from "../../../Core/FileClient";
import { CountText } from "../../../Core/Formatting/CountText";
import type { PanelContext } from "../../Shell/PanelContext";
import { RuleFormatGuide } from "./RuleFormatGuide";

const JsonMimeType = "application/json";
const JsonAccept = ".json,application/json";
const ExportFileName = "rewire-profiles.json";
const NothingTickedText = "Tick at least one profile.";

interface ModeChoice {
    mode: ImportMode;
    label: string;
}

const ModeChoices: ModeChoice[] = [
    {
        mode: ImportMode.Merge,
        label: "Merge: add new profiles, patch the ones with the same id",
    },
    {
        mode: ImportMode.Replace,
        label: "Replace: delete every profile, keep only the imported ones",
    },
];

function summaryOf(profile: RuleProfile): string {
    return `${profile.name} (${CountText.of(profile.rules.length, "rule")}, ${CountText.of(profile.variables.length, "variable")})`;
}

function profileChecklist(
    profiles: RuleProfile[],
    selected: Set<string>,
    describe: (profile: RuleProfile) => string
): HTMLElement {
    return buildElement("div", {
        className: "profile-checklist",
        attributes: {
            role: "group",
        },
        children: profiles.map(profile => FormControls.checkbox({
            checked: selected.has(profile.id),
            label: describe(profile),
            onChange: checked => {
                if (checked) {
                    selected.add(profile.id);

                    return;
                }

                selected.delete(profile.id);
            },
        })),
    });
}

export class ProfileTransferPanel implements ISlidePanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _fileClient: IFileClient;
    private readonly _exportList: HTMLElement;
    private readonly _preview: HTMLElement;
    private readonly _pasteBox: HTMLTextAreaElement;
    private readonly _exportIds: Set<string>;
    private readonly _importIds = new Set<string>();
    private _includeSecrets = false;
    private _mode = ImportMode.Merge;
    private _pending: RuleProfile[] = [];

    constructor(context: PanelContext, fileClient: IFileClient) {
        this._context = context;
        this._fileClient = fileClient;
        const profiles = context.settingsService.current().profiles;
        this._exportIds = new Set(profiles.map(profile => profile.id));
        this._exportList = profileChecklist(
            profiles,
            this._exportIds,
            summaryOf
        );
        this._exportList.setAttribute("aria-label", "Profiles to export");
        this._preview = buildElement("div", {
            className: "import-preview",
        });
        this._pasteBox = FormControls.textArea({
            value: "",
            rows: 4,
            className: "input code-input import-paste",
            placeholder: "Paste profiles JSON",
        });

        this.root = buildElement("div", {
            className: "transfer-panel",
            children: [
                buildElement("section", {
                    className: "editor-section",
                    children: [
                        buildElement("h3", {
                            className: "editor-section-title",
                            text: "Export",
                        }),
                        this._exportList,
                        FormControls.checkbox({
                            checked: false,
                            label: "Include cookie values, auth headers and secret variables",
                            onChange: checked => {
                                this._includeSecrets = checked;
                            },
                        }),
                        buildElement("div", {
                            className: "actions",
                            children: [
                                FormControls.button({
                                    text: "Copy JSON",
                                    onClick: () => void this.copyProfiles(),
                                }),
                                FormControls.button({
                                    text: "Download JSON",
                                    variant: ButtonVariants.Primary,
                                    onClick: () => this.downloadProfiles(),
                                }),
                            ],
                        }),
                    ],
                }),
                buildElement("section", {
                    className: "editor-section",
                    children: [
                        buildElement("h3", {
                            className: "editor-section-title",
                            text: "Import",
                        }),
                        this._pasteBox,
                        buildElement("div", {
                            className: "actions",
                            children: [
                                FormControls.button({
                                    text: "Choose file",
                                    onClick: () => void this.pickFile(),
                                }),
                                FormControls.button({
                                    text: "Read pasted JSON",
                                    onClick: () => this.readPasted(),
                                }),
                            ],
                        }),
                        this._preview,
                    ],
                }),
                buildElement("section", {
                    className: "editor-section",
                    children: [
                        buildElement("h3", {
                            className: "editor-section-title",
                            text: "Write rules with AI",
                        }),
                        buildElement("p", {
                            className: "muted",
                            text: "Copies how rules are written as JSON, with examples. None of your rules are in it.",
                        }),
                        buildElement("p", {
                            className: "muted",
                            text: "Paste it into an AI chat with what you need, then paste the answer under Import.",
                        }),
                        buildElement("div", {
                            className: "actions",
                            children: [
                                FormControls.button({
                                    text: "Copy rule format",
                                    onClick: () => void this.copyRuleFormat(),
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
            this._context.notifier.show(NothingTickedText);

            return null;
        }

        return JsonText.stringify(ProfileTransfer.export(
            this._context.settingsService.current(),
            [...this._exportIds],
            this._includeSecrets
        ));
    }

    private downloadProfiles(): void {
        const json = this.exportJson();
        if (json === null) {
            return;
        }

        this._fileClient.download(
            json,
            ExportFileName,
            JsonMimeType
        );
    }

    private async copyProfiles(): Promise<void> {
        const json = this.exportJson();
        if (json === null) {
            return;
        }

        const copied = await this._context.clipboardClient.copy(json);
        this._context.notifier.show(copied.hasErrors ? copied.error : "Profiles JSON copied.");
    }

    private async pickFile(): Promise<void> {
        const picked = await this._fileClient.pickText(JsonAccept);
        if (picked.hasErrors) {
            this.showError(picked.error);

            return;
        }

        if (picked.value === null) {
            return;
        }

        this.load(picked.value);
    }

    private readPasted(): void {
        const text = JsonCodeBlock.of(this._pasteBox.value);
        if (text === "") {
            this.showError("Paste the JSON first.");

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

    private async copyRuleFormat(): Promise<void> {
        const copied = await this._context.clipboardClient.copy(RuleFormatGuide.text());
        this._context.notifier.show(copied.hasErrors ? copied.error : "Rule format copied.");
    }

    private showPreview(profiles: RuleProfile[]): void {
        const currentIds = new Set(this._context.settingsService
            .current()
            .profiles
            .map(profile => profile.id));
        this._pending = profiles;
        this._importIds.clear();
        profiles.forEach(profile => this._importIds.add(profile.id));
        this._mode = ImportMode.Merge;

        const checklist = profileChecklist(
            profiles,
            this._importIds,
            profile => currentIds.has(profile.id) ? `${summaryOf(profile)}, same id as yours` : summaryOf(profile)
        );
        checklist.setAttribute("aria-label", "Profiles to import");
        const modeSelect = FormControls.select({
            value: String(this._mode),
            options: ModeChoices.map(choice => ({
                value: String(choice.mode),
                label: choice.label,
            })),
            onChange: value => {
                this._mode = Number(value) as ImportMode;
            },
        });
        modeSelect.setAttribute("aria-label", "Import mode");

        this._preview.replaceChildren(
            checklist,
            modeSelect,
            FormControls.button({
                text: "Import",
                variant: ButtonVariants.Primary,
                onClick: () => void this.importPending(),
            })
        );
    }

    private async importPending(): Promise<void> {
        const profiles = this._pending.filter(profile => this._importIds.has(profile.id));
        if (profiles.length === 0) {
            this._context.notifier.show(NothingTickedText);

            return;
        }

        if (this._mode === ImportMode.Replace) {
            const confirmed = await ConfirmDialog.ask({
                title: "Replace every profile",
                message: `Delete your ${CountText.of(this._context.settingsService.current().profiles.length, "profile")} and keep only the ${CountText.of(profiles.length, "imported profile")}?`,
                confirmText: "Replace",
            });
            if (!confirmed) {
                return;
            }
        }

        const imported = await this._context.settingsService.importProfiles(profiles, this._mode);
        if (imported.hasErrors) {
            return;
        }

        this._context.notifier.show(`Imported ${CountText.of(profiles.length, "profile")}.`);
        this._pending = [];
        this._pasteBox.value = "";
        this._preview.replaceChildren();
    }

    private showError(message: string): void {
        this._preview.replaceChildren(buildElement("p", {
            className: "form-error",
            text: message,
        }));
    }
}
