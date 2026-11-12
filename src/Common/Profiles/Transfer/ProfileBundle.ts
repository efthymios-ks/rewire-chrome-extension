import type { RuleProfile } from "../../../Contracts/Settings/RuleProfile";

export interface ProfileBundle {
    schemaVersion: number;
    profiles: RuleProfile[];
}

export enum ImportMode {
    Merge = 1,
    Replace = 2,
}
