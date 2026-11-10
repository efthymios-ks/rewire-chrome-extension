import type { PanelSettings } from "./PanelSettings";

export const SettingsSchema = {
    CurrentVersion: 4,
    FirstRulesVersion: 2,
} as const;

export const DefaultPanelSettings: PanelSettings = {
    schemaVersion: SettingsSchema.CurrentVersion,
    interceptionEnabled: true,
    pinnedEndpoints: [],
    rules: [],
    testerSamples: [
        "https://api.example.com/api/v1/users/42/profile",
        "https://api.example.com/api/v1/users/profile?utm_source=mail",
    ],
};
