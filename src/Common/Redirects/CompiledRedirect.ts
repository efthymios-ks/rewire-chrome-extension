import type { TemplatePart } from "./TemplatePart";

export interface CompiledRedirect {
    regexFilter: string;
    regexSubstitution: string;
    template: TemplatePart[];
    referencedGroups: number[];
}
