import type { Rule } from "../Rules/Rule";

export interface PanelSettings {
    schemaVersion: number;
    interceptionEnabled: boolean;
    domainWhitelist: string[];
    pinnedEndpoints: string[];
    rules: Rule[];
    testerSamples: string[];
}
