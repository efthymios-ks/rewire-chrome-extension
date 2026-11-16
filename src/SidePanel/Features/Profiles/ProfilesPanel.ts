import { ProfileEdits } from '../../../Common/Profiles/ProfileEdits';
import type { RuleProfile } from '../../../Contracts/Settings/RuleProfile';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { ConfirmDialog } from '../../Core/Dom/ConfirmDialog';
import { FormControls } from '../../Core/Dom/FormControls';
import type { SlidePanel } from '../../Core/Dom/SlidePanel';
import { Equalities } from '../../Core/Equalities';
import { CountText } from '../../Core/Formatting/CountText';
import type { PanelContext } from '../Shell/PanelContext';

const ACTIVE_GROUP_NAME = 'active-profile';

export interface RowOptions {
    profile: RuleProfile;
    isActive: boolean;
    canRemove: boolean;
}

export class ProfilesPanel implements SlidePanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _list: HTMLElement;
    private readonly _unsubscribe: () => void;

    constructor(context: PanelContext) {
        this._context = context;
        this._list = buildElement('ul', {
            className: 'profile-list',
        });

        this.root = buildElement('div', {
            className: 'profiles-panel',
            children: [
                buildElement('p', {
                    className: 'help-text',
                    text: 'Each profile holds its own rules and variables. Only the active one runs.',
                }),
                FormControls.button({
                    text: 'New profile',
                    variant: BUTTON_VARIANTS.Primary,
                    onClick: () => void context.settingsService.createProfileAsync(),
                }),
                this._list,
            ],
        });

        this._unsubscribe = context.store.select({
            selector: state => [
                state.settings.profiles,
                state.settings.activeProfileId,
            ],
            listener: () => this.render(),
            isEqual: Equalities.shallowArray,
        });
    }

    dispose(): void {
        this._unsubscribe();
    }

    private render(): void {
        const settings = this._context.store.getState().settings;
        const canRemove = ProfileEdits.canRemove(settings);
        this._list.replaceChildren(...settings.profiles.map(profile => this.row({
            profile,
            isActive: profile.id === settings.activeProfileId,
            canRemove,
        })));
    }

    private row({ profile, isActive, canRemove }: RowOptions): HTMLElement {
        const { settingsService } = this._context;
        const activeInput = buildElement('input', {
            attributes: {
                type: 'radio',
                name: ACTIVE_GROUP_NAME,
                'aria-label': `Use ${profile.name}`,
                title: 'Make this the active profile',
            },
            listeners: {
                change: () => void settingsService.switchProfileAsync(profile.id),
            },
        });
        activeInput.checked = isActive;

        const nameInput = FormControls.textInput({
            value: profile.name,
            className: 'input profile-name',
            onChange: name => void settingsService.renameProfileAsync(profile.id, name),
        });
        nameInput.setAttribute('aria-label', 'Profile name');

        const removeButton = FormControls.button({
            text: 'Remove',
            variant: BUTTON_VARIANTS.Ghost,
            title: canRemove ? 'Remove this profile' : 'Keep at least one profile',
            onClick: () => void this.removeAsync(profile),
        });
        removeButton.disabled = !canRemove;

        return buildElement('li', {
            className: 'profile-row',
            attributes: isActive ? { 'data-active': '' } : {},
            children: [
                activeInput,
                nameInput,
                buildElement('span', {
                    className: 'profile-count',
                    text: `${CountText.of({
                        count: profile.rules.length,
                        singular: 'rule',
                    })}, ${CountText.of({
                        count: profile.variables.length,
                        singular: 'variable',
                    })}`,
                }),
                buildElement('div', {
                    className: 'row-actions',
                    children: [
                        FormControls.button({
                            text: 'Duplicate',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => void settingsService.duplicateProfileAsync(profile.id),
                        }),
                        removeButton,
                    ],
                }),
            ],
        });
    }

    private async removeAsync(profile: RuleProfile): Promise<void> {
        const confirmed = await ConfirmDialog.askAsync({
            title: 'Remove profile',
            message: `Remove "${profile.name}" with its ${CountText.of({
                count: profile.rules.length,
                singular: 'rule',
            })} and ${CountText.of({
                count: profile.variables.length,
                singular: 'variable',
            })}?`,
            confirmText: 'Remove',
        });
        if (!confirmed) {
            return;
        }

        await this._context.settingsService.removeProfileAsync(profile.id);
    }
}
