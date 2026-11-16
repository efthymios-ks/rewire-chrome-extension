import type { RuleProfile } from '../../../Contracts/Settings/RuleProfile';

export interface ProfileBundle {
    schemaVersion: number;
    profiles: RuleProfile[];
}
