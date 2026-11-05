import type { Rule } from "../../Contracts/Rules/Rule";

export interface RuleEditRequest {
    rule: Rule;
    isNew: boolean;
    requestedAt: number;
}
