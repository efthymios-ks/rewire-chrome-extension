import type { RuleAction } from "../../../Contracts/Rules/Rule";

export enum FieldKind {
    Text = 1,
    TextArea = 2,
    Code = 3,
    Number = 4,
    Select = 5,
    Checkbox = 6,
    Status = 7,
    Latency = 8,
    StringList = 9,
    KeyValueList = 10,
    Operations = 11,
    MediaType = 12,
}

export interface SelectOption {
    value: string;
    label: string;
}

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

export const CommonFields = {
    DelayKey: "delayMs",

    latency(): FieldSpec {
        return {
            kind: FieldKind.Latency,
            key: CommonFields.DelayKey,
            label: "Latency",
        };
    },
};
