import { type PanelTheme, PANEL_THEMES } from './PanelTheme';

const THEME_STORAGE_KEY = 'rewire.theme';
const STORABLE_THEMES: readonly string[] = Object.values(PANEL_THEMES);

function isPanelTheme(value: string | null): value is PanelTheme {
    return value != null && STORABLE_THEMES.includes(value);
}

export const ThemeStorage = {
    load(): PanelTheme {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);

            return isPanelTheme(stored) ? stored : PANEL_THEMES.System;
        } catch {
            return PANEL_THEMES.System;
        }
    },

    save(theme: PanelTheme): void {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            return;
        }
    },
};
