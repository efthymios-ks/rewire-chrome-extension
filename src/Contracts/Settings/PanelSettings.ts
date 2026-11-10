import type { Rule } from "../Rules/Rule";

export interface PanelSettings {
    schemaVersion: number;
    interceptionEnabled: boolean;
    pinnedEndpoints: string[];
    rules: Rule[];
    testerSamples: string[];
}
