import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import type { FieldKind } from './FieldKind';
import type { SelectOption } from './SelectOption';

export interface FieldSpec {
    kind: FieldKind;
    key: string;
    label: string;
    hint?: string;
    placeholder?: string;
    nameLabel?: string;
    nameSuggestions?: readonly string[];
    valueSuggestionsFor?: (name: string) => readonly string[];
    options?: SelectOption[];
    rows?: number;
    min?: number;
    max?: number;
    visibleWhen?: (action: RuleAction) => boolean;
}
