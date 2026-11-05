import type { Rule } from "../../../Contracts/Rules/Rule";

export interface RuleBundle {
    schemaVersion: number;
    rules: Rule[];
}

export enum ImportMode {
    Merge = 1,
    Replace = 2,
}
