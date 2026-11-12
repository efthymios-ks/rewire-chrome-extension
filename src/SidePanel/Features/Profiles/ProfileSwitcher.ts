import { buildElement } from "../../Core/Dom/ElementBuilder";
import { Equalities } from "../../Core/Equalities";
import type { PanelContext } from "../Shell/PanelContext";

const SwitcherLabel = "Profile";
const SwitcherTitle = "The profile whose rules and variables are on";

export class ProfileSwitcher {
    readonly root: HTMLSelectElement;

    constructor(context: PanelContext) {
        this.root = buildElement("select", {
            className: "input profile-select",
            title: SwitcherTitle,
            attributes: {
                "aria-label": SwitcherLabel,
            },
            listeners: {
                change: () => void context.settingsService.switchProfile(this.root.value),
            },
        });

        context.store.select(
            state => [
                state.settings.profiles,
                state.settings.activeProfileId,
            ],
            () => this.render(context),
            Equalities.shallowArray
        );
    }

    private render(context: PanelContext): void {
        const settings = context.store.getState().settings;
        this.root.replaceChildren(...settings.profiles.map(profile => buildElement("option", {
            text: profile.name,
            attributes: {
                value: profile.id,
            },
        })));
        this.root.value = settings.activeProfileId;
    }
}
