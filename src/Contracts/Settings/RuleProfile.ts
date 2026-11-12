import type { Rule } from "../Rules/Rule";
import type { ProfileVariable } from "./ProfileVariable";

export interface RuleProfile {
    id: string;
    name: string;
    rules: Rule[];
    variables: ProfileVariable[];
}
