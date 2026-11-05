import { type PanelTheme, PanelThemes, type ResolvedTheme } from "./PanelTheme";

const DarkSchemeQuery = "(prefers-color-scheme: dark)";

export const ThemeResolver = {
    prefersDark(): boolean {
        return window.matchMedia(DarkSchemeQuery).matches;
    },

    watchSystem(onChange: () => void): void {
        window
            .matchMedia(DarkSchemeQuery)
            .addEventListener("change", onChange);
    },

    effective(theme: PanelTheme, prefersDark: boolean): ResolvedTheme {
        if (theme !== PanelThemes.System) {
            return theme;
        }

        return prefersDark ? PanelThemes.Dark : PanelThemes.Light;
    },

    toggled(theme: PanelTheme, prefersDark: boolean): PanelTheme {
        return ThemeResolver.effective(theme, prefersDark) === PanelThemes.Dark ? PanelThemes.Light : PanelThemes.Dark;
    },
};
