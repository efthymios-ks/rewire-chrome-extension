export const PANEL_THEMES = Object.freeze({
    System: 'system',
    Light: 'light',
    Dark: 'dark',
} as const);

export type PanelTheme = typeof PANEL_THEMES[keyof typeof PANEL_THEMES];

export type ResolvedTheme = typeof PANEL_THEMES.Light | typeof PANEL_THEMES.Dark;
