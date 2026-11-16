import type { Criterion } from '../../../Contracts/Rules/Criterion';
import type { RuleContext } from '../Context/RuleContext';
import type { MatchFacts } from '../Drafts/MatchFacts';
import type { CriterionStage } from './CriterionStage';
import type { DnrFragment } from './DnrFragment';

export interface ReadOptions {
    facts: MatchFacts;
    criterion: Criterion;
    context: RuleContext;
}

export interface CriterionField {
    readonly id: string;
    readonly label: string;
    readonly stage: CriterionStage;
    readonly operators: string[];
    readonly needsName: boolean;
    readonly valuePlaceholder: string;
    readonly valueSuggestions?: readonly string[];
    readonly nameSuggestions?: readonly string[];
    readonly valueSuggestionsFor?: (name: string) => readonly string[];
    readonly isCaseInsensitive?: boolean;
    read(options: ReadOptions): string[];
    toDnr(criterion: Criterion): DnrFragment;
    check?(criterion: Criterion): string[];
    expectedOf?(criterion: Criterion): string;
}
