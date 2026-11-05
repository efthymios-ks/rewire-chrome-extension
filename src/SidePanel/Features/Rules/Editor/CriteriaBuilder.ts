import { CriterionFieldRegistry, CriterionFields } from "../../../../Common/Rules/Criteria/CriterionFields";
import { CriterionOperatorRegistry } from "../../../../Common/Rules/Criteria/CriterionOperators";
import { CriteriaMatches, type CriteriaMatch, type Criterion, CriterionFieldIds, type RuleCriteria } from "../../../../Contracts/Rules/Criterion";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../../Core/Dom/FormControls";
import { SuggestionInput } from "../../../Core/Dom/SuggestionInput";

const CriterionValueClass = "input criterion-value";
const CriterionNameClass = "input criterion-name";
const NamePlaceholder = "Name";

interface TextInputArguments {
    value: string;
    placeholder: string;
    suggestions: readonly string[] | undefined;
    className: string;
    onInput: (value: string) => void;
}

function textInputOf(args: TextInputArguments): HTMLElement {
    if (args.suggestions === undefined) {
        return FormControls.textInput({
            value: args.value,
            placeholder: args.placeholder,
            className: args.className,
            onInput: args.onInput,
        });
    }

    return SuggestionInput.build({
        value: args.value,
        placeholder: args.placeholder,
        suggestions: args.suggestions,
        className: args.className,
        onInput: args.onInput,
    });
}

const NegateValues = {
    Is: "is",
    IsNot: "isNot",
} as const;

function firstOperatorOf(fieldId: string): string {
    return CriterionFieldRegistry.get(fieldId)?.operators[0] ?? "";
}

function newCriterion(): Criterion {
    return {
        field: CriterionFieldIds.Url,
        op: firstOperatorOf(CriterionFieldIds.Url),
        name: "",
        value: "",
        negate: false,
    };
}

export class CriteriaBuilder {
    readonly root: HTMLElement;

    private readonly _list: HTMLElement;
    private readonly _onChange: (criteria: RuleCriteria) => void;
    private _criteria: RuleCriteria;

    constructor(criteria: RuleCriteria, onChange: (criteria: RuleCriteria) => void) {
        this._criteria = structuredClone(criteria);
        this._onChange = onChange;
        this._list = buildElement("ol", {
            className: "criteria-list",
        });

        this.root = buildElement("div", {
            className: "criteria-builder",
            children: [
                buildElement("div", {
                    className: "field-row",
                    children: [
                        buildElement("span", {
                            text: "Match",
                        }),
                        FormControls.select({
                            value: this._criteria.match,
                            options: [
                                {
                                    value: CriteriaMatches.All,
                                    label: "all of",
                                },
                                {
                                    value: CriteriaMatches.Any,
                                    label: "any of",
                                },
                            ],
                            onChange: value => this.change({
                                ...this._criteria,
                                match: value as CriteriaMatch,
                            }),
                        }),
                        buildElement("span", {
                            className: "muted",
                            text: "these conditions. None means every request.",
                        }),
                    ],
                }),
                this._list,
                FormControls.button({
                    text: "Add condition",
                    variant: ButtonVariants.Ghost,
                    onClick: () => {
                        this.change({
                            ...this._criteria,
                            items: [
                                ...this._criteria.items,
                                newCriterion(),
                            ],
                        });
                        this.render();
                    },
                }),
            ],
        });
        this.render();
    }

    private change(criteria: RuleCriteria): void {
        this._criteria = criteria;
        this._onChange(structuredClone(criteria));
    }

    private changeItem(
        index: number,
        patch: Partial<Criterion>,
        rerender: boolean
    ): void {
        this.change({
            ...this._criteria,
            items: this._criteria.items.map((current, itemIndex) => itemIndex === index
                ? {
                    ...current,
                    ...patch,
                }
                : current),
        });
        if (rerender) {
            this.render();
        }
    }

    private render(): void {
        this._list.replaceChildren(...this._criteria.items.map((item, index) => this.rowOf(item, index)));
    }

    private valueInputOf(item: Criterion, index: number): HTMLElement {
        const field = CriterionFieldRegistry.get(item.field);

        return textInputOf({
            value: item.value,
            placeholder: field?.valuePlaceholder ?? "",
            suggestions: field?.valueSuggestions,
            className: CriterionValueClass,
            onInput: value => this.changeItem(
                index,
                {
                    value,
                },
                false
            ),
        });
    }

    private nameInputOf(item: Criterion, index: number): HTMLElement {
        const field = CriterionFieldRegistry.get(item.field);

        return textInputOf({
            value: item.name,
            placeholder: NamePlaceholder,
            suggestions: field?.nameSuggestions,
            className: CriterionNameClass,
            onInput: name => this.changeItem(
                index,
                {
                    name,
                },
                false
            ),
        });
    }

    private rowOf(item: Criterion, index: number): HTMLElement {
        const field = CriterionFieldRegistry.get(item.field);
        const operator = CriterionOperatorRegistry.get(item.op);

        return buildElement("li", {
            className: "criterion-row",
            children: [
                FormControls.select({
                    value: item.field,
                    options: CriterionFields.map(candidate => ({
                        value: candidate.id,
                        label: candidate.label,
                    })),
                    onChange: value => this.changeItem(
                        index,
                        {
                            field: value,
                            op: firstOperatorOf(value),
                        },
                        true
                    ),
                }),
                field?.needsName === true ? this.nameInputOf(item, index) : null,
                FormControls.select({
                    value: item.negate ? NegateValues.IsNot : NegateValues.Is,
                    options: [
                        {
                            value: NegateValues.Is,
                            label: "is",
                        },
                        {
                            value: NegateValues.IsNot,
                            label: "is not",
                        },
                    ],
                    onChange: value => this.changeItem(
                        index,
                        {
                            negate: value === NegateValues.IsNot,
                        },
                        false
                    ),
                }),
                FormControls.select({
                    value: item.op,
                    options: (field?.operators ?? []).map(operatorId => ({
                        value: operatorId,
                        label: CriterionOperatorRegistry.get(operatorId)?.label ?? operatorId,
                    })),
                    onChange: value => this.changeItem(
                        index,
                        {
                            op: value,
                        },
                        true
                    ),
                }),
                operator?.needsValue === false ? null : this.valueInputOf(item, index),
                FormControls.button({
                    text: "Remove",
                    variant: ButtonVariants.Ghost,
                    onClick: () => {
                        this.change({
                            ...this._criteria,
                            items: this._criteria.items.filter((_, itemIndex) => itemIndex !== index),
                        });
                        this.render();
                    },
                }),
            ],
        });
    }
}
