import { buildElement } from "../../Core/Dom/ElementBuilder";
import { type PanelTheme, PanelThemes, type ResolvedTheme } from "../../Core/PanelTheme";
import { ThemeResolver } from "../../Core/ThemeResolver";
import type { PanelContext } from "./PanelContext";

interface ThemeAppearance {
    glyph: string;
    title: string;
}

const Appearances: Record<ResolvedTheme, ThemeAppearance> = {
    [PanelThemes.Light]: {
        glyph: "☾",
        title: "Switch to the dark theme",
    },
    [PanelThemes.Dark]: {
        glyph: "☀",
        title: "Switch to the light theme",
    },
};

export class ThemeToggle {
    readonly root: HTMLButtonElement;

    constructor(context: PanelContext) {
        this.root = buildElement("button", {
            className: "button button-ghost icon-button theme-toggle",
            attributes: {
                type: "button",
            },
            listeners: {
                click: () => context.store.update(state => ({
                    ...state,
                    theme: ThemeResolver.toggled(state.theme, ThemeResolver.prefersDark()),
                })),
            },
        });

        const render = (theme: PanelTheme): void => {
            const appearance = Appearances[ThemeResolver.effective(theme, ThemeResolver.prefersDark())];
            this.root.textContent = appearance.glyph;
            this.root.title = appearance.title;
            this.root.setAttribute("aria-label", appearance.title);
        };

        context.store.select(
            state => state.theme,
            render
        );
        ThemeResolver.watchSystem(() => render(context.store.getState().theme));
    }
}
