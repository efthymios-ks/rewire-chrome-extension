import { CriterionFieldRegistry } from '../../../../Common/Rules/Criteria/CriterionFieldRegistry';
import { CRITERION_FIELDS } from '../../../../Common/Rules/Criteria/CriterionFields';
import { CriterionOperatorRegistry } from '../../../../Common/Rules/Criteria/CriterionOperatorRegistry';
import type { CriteriaMatch } from '../../../../Contracts/Rules/CriteriaMatch';
import { CRITERIA_MATCHES } from '../../../../Contracts/Rules/CriteriaMatches';
import type { Criterion } from '../../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../../Contracts/Rules/CriterionFieldIds';
import type { RuleCriteria } from '../../../../Contracts/Rules/RuleCriteria';
import { buildElement } from '../../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../../Core/Dom/ButtonVariants';
import { FormControls } from '../../../Core/Dom/FormControls';
import { SuggestionInput, type SuggestionSource } from '../../../Core/Dom/SuggestionInput';

const CRITERION_VALUE_CLASS = 'input criterion-value';
const CRITERION_NAME_CLASS = 'input criterion-name';
const NAME_PLACEHOLDER = 'Name';

interface TextInputArguments {
    value: string;
    placeholder: string;
    suggestions: SuggestionSource | undefined;
    className: string;
    onInput: (value: string) => void;
}

function textInputOf(args: TextInputArguments): HTMLElement {
    if (args.suggestions == null) {
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

const NEGATE_VALUES = Object.freeze({
    Is: 'is',
    IsNot: 'isNot',
} as const);

function firstOperatorOf(fieldId: string): string {
    return CriterionFieldRegistry.get(fieldId)?.operators[0] ?? '';
}

function newCriterion(): Criterion {
    return {
        field: CRITERION_FIELD_IDS.Url,
        op: firstOperatorOf(CRITERION_FIELD_IDS.Url),
        name: '',
        value: '',
        negate: false,
    };
}

export interface ChangeItemOptions {
    index: number;
    patch: Partial<Criterion>;
    shouldRerender: boolean;
}

export class CriteriaBuilder {
    readonly root: HTMLElement;

    private readonly _list: HTMLElement;
    private readonly _onChange: (criteria: RuleCriteria) => void;
    private _criteria: RuleCriteria;

    constructor(criteria: RuleCriteria, onChange: (criteria: RuleCriteria) => void) {
        this._criteria = structuredClone(criteria);
        this._onChange = onChange;
        this._list = buildElement('ol', {
            className: 'criteria-list',
        });

        this.root = buildElement('div', {
            className: 'criteria-builder',
            children: [
                buildElement('div', {
                    className: 'field-row',
                    children: [
                        buildElement('span', {
                            text: 'Match',
                        }),
                        FormControls.select({
                            value: this._criteria.match,
                            options: [
                                {
                                    value: CRITERIA_MATCHES.All,
                                    label: 'all of',
                                },
                                {
                                    value: CRITERIA_MATCHES.Any,
                                    label: 'any of',
                                },
                            ],
                            onChange: value => this.change({
                                ...this._criteria,
                                match: value as CriteriaMatch,
                            }),
                        }),
                        buildElement('span', {
                            className: 'help-text',
                            text: 'these conditions. None means every request.',
                        }),
                    ],
                }),
                this._list,
                FormControls.button({
                    text: 'Add condition',
                    variant: BUTTON_VARIANTS.Ghost,
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

    private changeItem({ index, patch, shouldRerender }: ChangeItemOptions): void {
        this.change({
            ...this._criteria,
            items: this._criteria.items.map((current, itemIndex) => itemIndex === index
                ? {
                    ...current,
                    ...patch,
                }
                : current),
        });
        if (shouldRerender) {
            this.render();
        }
    }

    private render(): void {
        this._list.replaceChildren(...this._criteria.items.map((item, index) => this.rowOf(item, index)));
    }

    private valueInputOf(item: Criterion, index: number): HTMLElement {
        const field = CriterionFieldRegistry.get(item.field);
        const suggestionsFor = field?.valueSuggestionsFor;

        return textInputOf({
            value: item.value,
            placeholder: field?.valuePlaceholder ?? '',
            suggestions: suggestionsFor == null
                ? field?.valueSuggestions
                : () => suggestionsFor(this._criteria.items[index]?.name ?? ''),
            className: CRITERION_VALUE_CLASS,
            onInput: value => this.changeItem({
                index,
                patch: {
                    value,
                },
                shouldRerender: false,
            }),
        });
    }

    private nameInputOf(item: Criterion, index: number): HTMLElement {
        const field = CriterionFieldRegistry.get(item.field);

        return textInputOf({
            value: item.name,
            placeholder: NAME_PLACEHOLDER,
            suggestions: field?.nameSuggestions,
            className: CRITERION_NAME_CLASS,
            onInput: name => this.changeItem({
                index,
                patch: {
                    name,
                },
                shouldRerender: false,
            }),
        });
    }

    private rowOf(item: Criterion, index: number): HTMLElement {
        const field = CriterionFieldRegistry.get(item.field);
        const operator = CriterionOperatorRegistry.get(item.op);

        return buildElement('li', {
            className: 'criterion-row',
            children: [
                FormControls.select({
                    value: item.field,
                    options: CRITERION_FIELDS.map(candidate => ({
                        value: candidate.id,
                        label: candidate.label,
                    })),
                    onChange: value => this.changeItem({
                        index,
                        patch: {
                            field: value,
                            op: firstOperatorOf(value),
                        },
                        shouldRerender: true,
                    }),
                }),
                field?.needsName === true ? this.nameInputOf(item, index) : null,
                FormControls.select({
                    value: item.negate ? NEGATE_VALUES.IsNot : NEGATE_VALUES.Is,
                    options: [
                        {
                            value: NEGATE_VALUES.Is,
                            label: 'is',
                        },
                        {
                            value: NEGATE_VALUES.IsNot,
                            label: 'is not',
                        },
                    ],
                    onChange: value => this.changeItem({
                        index,
                        patch: {
                            negate: value === NEGATE_VALUES.IsNot,
                        },
                        shouldRerender: false,
                    }),
                }),
                FormControls.select({
                    value: item.op,
                    options: (field?.operators ?? []).map(operatorId => ({
                        value: operatorId,
                        label: CriterionOperatorRegistry.get(operatorId)?.label ?? operatorId,
                    })),
                    onChange: value => this.changeItem({
                        index,
                        patch: {
                            op: value,
                        },
                        shouldRerender: true,
                    }),
                }),
                operator?.needsValue === false ? null : this.valueInputOf(item, index),
                FormControls.button({
                    text: 'Remove',
                    variant: BUTTON_VARIANTS.Ghost,
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
