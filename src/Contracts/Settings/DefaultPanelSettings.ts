import type { PanelSettings } from "./PanelSettings";
import type { RuleProfile } from "./RuleProfile";

export const SettingsSchema = {
    CurrentVersion: 5,
    FirstRulesVersion: 2,
    FirstRewriteVersion: 4,
    FirstProfilesVersion: 5,
} as const;

export const DefaultProfile: RuleProfile = {
    id: "default",
    name: "Default",
    rules: [],
    variables: [],
};

export const DefaultPanelSettings: PanelSettings = {
    schemaVersion: SettingsSchema.CurrentVersion,
    interceptionEnabled: true,
    pinnedEndpoints: [],
    activeProfileId: DefaultProfile.id,
    profiles: [DefaultProfile],
    testerSamples: [
        "https://api.example.com/api/v1/users/42/profile",
        "https://api.example.com/api/v1/users/profile?utm_source=mail",
    ],
};
