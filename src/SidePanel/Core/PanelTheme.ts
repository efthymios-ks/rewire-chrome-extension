export const PanelThemes = {
    System: "system",
    Light: "light",
    Dark: "dark",
} as const;

export type PanelTheme = typeof PanelThemes[keyof typeof PanelThemes];

export type ResolvedTheme = typeof PanelThemes.Light | typeof PanelThemes.Dark;
