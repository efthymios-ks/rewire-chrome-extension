import { ProfileEdits } from "../../../Common/Profiles/ProfileEdits";
import type { RuleProfile } from "../../../Contracts/Settings/RuleProfile";
import { ConfirmDialog } from "../../Core/Dom/ConfirmDialog";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import type { ISlidePanel } from "../../Core/Dom/ISlidePanel";
import { Equalities } from "../../Core/Equalities";
import { CountText } from "../../Core/Formatting/CountText";
import type { PanelContext } from "../Shell/PanelContext";

const ActiveGroupName = "active-profile";

export class ProfilesPanel implements ISlidePanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _list: HTMLElement;
    private readonly _unsubscribe: () => void;

    constructor(context: PanelContext) {
        this._context = context;
        this._list = buildElement("ul", {
            className: "profile-list",
        });

        this.root = buildElement("div", {
            className: "profiles-panel",
            children: [
                buildElement("p", {
                    className: "muted",
                    text: "Each profile holds its own rules and variables. Only the active one runs.",
                }),
                FormControls.button({
                    text: "New profile",
                    variant: ButtonVariants.Primary,
                    onClick: () => void context.settingsService.createProfile(),
                }),
                this._list,
            ],
        });

        this._unsubscribe = context.store.select(
            state => [
                state.settings.profiles,
                state.settings.activeProfileId,
            ],
            () => this.render(),
            Equalities.shallowArray
        );
    }

    dispose(): void {
        this._unsubscribe();
    }

    private render(): void {
        const settings = this._context.store.getState().settings;
        const canRemove = ProfileEdits.canRemove(settings);
        this._list.replaceChildren(...settings.profiles.map(profile => this.row(
            profile,
            profile.id === settings.activeProfileId,
            canRemove
        )));
    }

    private row(
        profile: RuleProfile,
        isActive: boolean,
        canRemove: boolean
    ): HTMLElement {
        const { settingsService } = this._context;
        const activeInput = buildElement("input", {
            attributes: {
                type: "radio",
                name: ActiveGroupName,
                "aria-label": `Use ${profile.name}`,
                title: "Make this the active profile",
            },
            listeners: {
                change: () => void settingsService.switchProfile(profile.id),
            },
        });
        activeInput.checked = isActive;

        const nameInput = FormControls.textInput({
            value: profile.name,
            className: "input profile-name",
            onChange: name => void settingsService.renameProfile(profile.id, name),
        });
        nameInput.setAttribute("aria-label", "Profile name");

        const removeButton = FormControls.button({
            text: "Remove",
            variant: ButtonVariants.Ghost,
            title: canRemove ? "Remove this profile" : "Keep at least one profile",
            onClick: () => void this.remove(profile),
        });
        removeButton.disabled = !canRemove;

        return buildElement("li", {
            className: isActive ? "profile-row active" : "profile-row",
            children: [
                activeInput,
                nameInput,
                buildElement("span", {
                    className: "profile-count muted",
                    text: `${CountText.of(profile.rules.length, "rule")}, ${CountText.of(profile.variables.length, "variable")}`,
                }),
                buildElement("div", {
                    className: "row-actions",
                    children: [
                        FormControls.button({
                            text: "Duplicate",
                            variant: ButtonVariants.Ghost,
                            onClick: () => void settingsService.duplicateProfile(profile.id),
                        }),
                        removeButton,
                    ],
                }),
            ],
        });
    }

    private async remove(profile: RuleProfile): Promise<void> {
        const confirmed = await ConfirmDialog.ask({
            title: "Remove profile",
            message: `Remove "${profile.name}" with its ${CountText.of(profile.rules.length, "rule")} and ${CountText.of(profile.variables.length, "variable")}?`,
            confirmText: "Remove",
        });
        if (!confirmed) {
            return;
        }

        await this._context.settingsService.removeProfile(profile.id);
    }
}
