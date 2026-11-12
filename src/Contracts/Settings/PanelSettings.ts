import type { RuleProfile } from "./RuleProfile";

export interface PanelSettings {
    schemaVersion: number;
    interceptionEnabled: boolean;
    pinnedEndpoints: string[];
    activeProfileId: string;
    profiles: RuleProfile[];
    testerSamples: string[];
}
