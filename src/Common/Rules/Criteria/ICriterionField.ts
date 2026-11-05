import type { Criterion } from "../../../Contracts/Rules/Criterion";
import type { RuleContext } from "../Context/RuleContext";
import type { MatchFacts } from "../Drafts/Drafts";
import type { CriterionStage } from "./CriterionStage";
import type { DnrFragment } from "./DnrFragment";

export interface ICriterionField {
    readonly id: string;
    readonly label: string;
    readonly stage: CriterionStage;
    readonly operators: string[];
    readonly needsName: boolean;
    readonly valuePlaceholder: string;
    readonly valueSuggestions?: readonly string[];
    readonly nameSuggestions?: readonly string[];
    read(
        facts: MatchFacts,
        criterion: Criterion,
        context: RuleContext
    ): string[];
    toDnr(criterion: Criterion): DnrFragment;
}
