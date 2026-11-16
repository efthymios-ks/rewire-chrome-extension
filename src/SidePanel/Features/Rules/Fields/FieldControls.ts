import { HeaderSuggestions } from '../../../../Common/Http/HeaderSuggestions';
import { JsonText } from '../../../../Common/Json/JsonText';
import { ActionReader } from '../../../../Common/Rules/Types/ActionReader';
import { FIELD_KIND, type FieldKind } from '../../../../Common/Rules/Types/FieldKind';
import type { FieldSpec } from '../../../../Common/Rules/Types/FieldSpec';
import { OPERATION_KINDS } from '../../../../Common/Rules/Types/OperationKinds';
import { OPERATION_OPTIONS } from '../../../../Common/Rules/Types/OperationOptions';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { buildElement } from '../../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../../Core/Dom/ButtonVariants';
import { FormControls } from '../../../Core/Dom/FormControls';
import type { FileClient } from '../../../Core/FileClient';
import type { Notifier } from '../../../Core/Notifier';
import { SuggestionInput } from '../../../Core/Dom/SuggestionInput';
import { COLUMN_KIND } from './ColumnKind';
import { LatencySlider } from './LatencySlider';
import { type RowColumn, RowTable, type TableRow } from './RowTable';
import { StatusCodeSelect } from './StatusCodeSelect';

const LIST_SEPARATOR = ',';
const DEFAULT_ROWS = 3;
const VALUE_KEY = 'value';
const VALUE_LABEL = 'Value';

export interface FieldControlArguments {
    spec: FieldSpec;
    action: RuleAction;
    onChange: (value: unknown) => void;
    fileClient: FileClient;
    notifier: Notifier;
}

type FieldControlBuilder = (args: FieldControlArguments) => HTMLElement;


function isCell(entry: [string, unknown]): entry is [string, string | number] {
    return typeof entry[1] === 'string' || typeof entry[1] === 'number';
}

function rowsOf(action: RuleAction, key: string): TableRow[] {
    return ActionReader.records({
        raw: action,
        key,
        map: item => Object.fromEntries(Object
            .entries(item)
            .filter(isCell)),
    });
}

interface TableOptions {
    args: FieldControlArguments;
    columns: RowColumn[];
    addLabel: string;
}

function table({ args, columns, addLabel }: TableOptions): RowTable {
    return new RowTable({
        columns,
        rows: rowsOf(args.action, args.spec.key),
        addLabel,
        onChange: args.onChange,
    });
}

interface TextColumnOptions {
    key: string;
    label: string;
    placeholder?: string;
}

function textColumn({ key, label, placeholder = label }: TextColumnOptions): RowColumn {
    return {
        key,
        label,
        kind: COLUMN_KIND.Text,
        placeholder,
    };
}

interface NameColumnOptions {
    args: FieldControlArguments;
    key: string;
    label: string;
}

function nameColumn({ args, key, label }: NameColumnOptions): RowColumn {
    const suggestions = args.spec.nameSuggestions;
    if (suggestions == null) {
        return textColumn({ key, label });
    }

    return {
        key,
        label,
        kind: COLUMN_KIND.Suggested,
        placeholder: label,
        suggestions,
    };
}

function valueColumn(args: FieldControlArguments, nameKey: string): RowColumn {
    const suggestionsFor = args.spec.valueSuggestionsFor;
    if (suggestionsFor == null) {
        return textColumn({ key: VALUE_KEY, label: VALUE_LABEL });
    }

    return {
        key: VALUE_KEY,
        label: VALUE_LABEL,
        kind: COLUMN_KIND.Suggested,
        placeholder: VALUE_LABEL,
        suggestionsOf: row => suggestionsFor(String(row[nameKey] ?? '')),
    };
}

function codeInput(args: FieldControlArguments): HTMLElement {
    const textArea = FormControls.textArea({
        value: ActionReader.text({ raw: args.action, key: args.spec.key }),
        rows: args.spec.rows ?? DEFAULT_ROWS,
        placeholder: args.spec.placeholder ?? '',
        onInput: args.onChange,
    });

    return buildElement('div', {
        className: 'code-field',
        children: [
            textArea,
            FormControls.button({
                text: 'Format JSON',
                variant: BUTTON_VARIANTS.Ghost,
                onClick: () => {
                    textArea.value = JsonText.format(textArea.value);
                    args.onChange(textArea.value);
                },
            }),
        ],
    });
}

function selectedValue(args: FieldControlArguments): string {
    const value = args.action[args.spec.key];
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }

    return args.spec.options?.[0]?.value ?? '';
}

const BUILDERS: Record<FieldKind, FieldControlBuilder> = {
    [FIELD_KIND.Text]: args => FormControls.textInput({
        value: ActionReader.text({ raw: args.action, key: args.spec.key }),
        placeholder: args.spec.placeholder ?? '',
        onInput: args.onChange,
    }),
    [FIELD_KIND.TextArea]: args => FormControls.textArea({
        value: ActionReader.text({ raw: args.action, key: args.spec.key }),
        rows: args.spec.rows ?? DEFAULT_ROWS,
        className: 'input',
        placeholder: args.spec.placeholder ?? '',
        onInput: args.onChange,
    }),
    [FIELD_KIND.Code]: codeInput,
    [FIELD_KIND.Number]: args => {
        const input = FormControls.textInput({
            value: String(ActionReader.number({
                raw: args.action,
                key: args.spec.key,
                fallback: args.spec.min ?? 0,
            })),
            type: 'number',
            onInput: value => args.onChange(Number(value)),
        });
        input.min = args.spec.min == null ? '' : String(args.spec.min);
        input.max = args.spec.max == null ? '' : String(args.spec.max);

        return input;
    },
    [FIELD_KIND.Select]: args => FormControls.select({
        value: selectedValue(args),
        options: args.spec.options ?? [],
        onChange: args.onChange,
    }),
    [FIELD_KIND.Checkbox]: args => FormControls.checkbox({
        checked: ActionReader.bool({ raw: args.action, key: args.spec.key, fallback: false }),
        label: args.spec.label,
        onChange: args.onChange,
    }),
    [FIELD_KIND.Status]: args => new StatusCodeSelect(
        /* statusCode: */ ActionReader.nullableNumber(args.action, args.spec.key),
        /* onChange: */ args.onChange,
    ).root,
    [FIELD_KIND.Latency]: args => new LatencySlider(
        /* delayInMilliseconds: */ ActionReader.delay(args.action),
        /* onChange: */ args.onChange,
    ).root,
    [FIELD_KIND.StringList]: args => FormControls.textInput({
        value: ActionReader.strings(args.action, args.spec.key).join(`${LIST_SEPARATOR} `),
        placeholder: args.spec.placeholder ?? '',
        onInput: value => args.onChange(value
            .split(LIST_SEPARATOR)
            .map(item => item.trim())
            .filter(item => item.length > 0)),
    }),
    [FIELD_KIND.KeyValueList]: args => table({
        args,
        columns: [
            nameColumn({ args, key: 'key', label: 'Name' }),
            valueColumn(args, 'key'),
        ],
        addLabel: 'Add row',
    }).root,
    [FIELD_KIND.Operations]: args => table({
        args,
        columns: [
            {
                key: 'op',
                label: 'Operation',
                kind: COLUMN_KIND.Select,
                options: OPERATION_OPTIONS,
                defaultValue: OPERATION_KINDS.AddOrUpdate,
            },
            nameColumn({ args, key: 'name', label: args.spec.nameLabel ?? 'Name' }),
            valueColumn(args, 'name'),
        ],
        addLabel: `Add ${(args.spec.nameLabel ?? 'row').toLowerCase()}`,
    }).root,
    [FIELD_KIND.MediaType]: args => SuggestionInput.build({
        value: ActionReader.text({ raw: args.action, key: args.spec.key }),
        placeholder: args.spec.placeholder ?? '',
        suggestions: HeaderSuggestions.mediaTypes(),
        onInput: args.onChange,
    }),
};

export const FieldControls = {
    build(args: FieldControlArguments): HTMLElement {
        const control = BUILDERS[args.spec.kind](args);
        if (args.spec.kind === FIELD_KIND.Checkbox) {
            return buildElement('div', {
                className: 'field',
                children: [
                    control,
                    args.spec.hint == null
                        ? null
                        : buildElement('span', {
                            className: 'field-hint',
                            text: args.spec.hint,
                        }),
                ],
            });
        }

        return FormControls.field({ label: args.spec.label, control, hint: args.spec.hint ?? null });
    },
};
