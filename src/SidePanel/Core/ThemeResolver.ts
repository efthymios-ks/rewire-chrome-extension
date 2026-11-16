import { type PanelTheme, PANEL_THEMES, type ResolvedTheme } from './PanelTheme';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export const ThemeResolver = {
    prefersDark(): boolean {
        return window.matchMedia(DARK_SCHEME_QUERY).matches;
    },

    watchSystem(onChange: () => void): void {
        window
            .matchMedia(DARK_SCHEME_QUERY)
            .addEventListener('change', onChange);
    },

    effective(theme: PanelTheme, prefersDark: boolean): ResolvedTheme {
        if (theme !== PANEL_THEMES.System) {
            return theme;
        }

        return prefersDark ? PANEL_THEMES.Dark : PANEL_THEMES.Light;
    },

    toggled(theme: PanelTheme, prefersDark: boolean): PanelTheme {
        return ThemeResolver.effective(theme, prefersDark) === PANEL_THEMES.Dark
            ? PANEL_THEMES.Light
            : PANEL_THEMES.Dark;
    },
};
