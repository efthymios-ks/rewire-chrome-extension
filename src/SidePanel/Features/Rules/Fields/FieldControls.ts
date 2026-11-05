import { JsonText } from "../../../../Common/Json/JsonText";
import { ActionReader } from "../../../../Common/Rules/Types/ActionReader";
import { FieldKind, type FieldSpec } from "../../../../Common/Rules/Types/FieldSpec";
import { OperationKinds, OperationOptions } from "../../../../Common/Rules/Types/OperationKinds";
import { CommonMediaTypes } from "../../../../Contracts/Http/CommonMediaTypes";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../../Core/Dom/FormControls";
import type { IFileClient } from "../../../Core/FileClient";
import type { Notifier } from "../../../Core/Notifier";
import { SuggestionInput } from "../../../Core/Dom/SuggestionInput";
import { LatencySlider } from "./LatencySlider";
import { ColumnKind, type RowColumn, RowTable, type TableRow } from "./RowTable";
import { StatusCodeSelect } from "./StatusCodeSelect";

const ListSeparator = ",";
const DefaultRows = 3;

export interface FieldControlArguments {
    spec: FieldSpec;
    action: RuleAction;
    onChange: (value: unknown) => void;
    fileClient: IFileClient;
    notifier: Notifier;
}

type FieldControlBuilder = (args: FieldControlArguments) => HTMLElement;

function isCell(entry: [string, unknown]): entry is [string, string | number] {
    return typeof entry[1] === "string" || typeof entry[1] === "number";
}

function rowsOf(action: RuleAction, key: string): TableRow[] {
    return ActionReader.records(
        action,
        key,
        item => Object.fromEntries(Object
            .entries(item)
            .filter(isCell))
    );
}

function table(
    args: FieldControlArguments,
    columns: RowColumn[],
    addLabel: string
): RowTable {
    return new RowTable({
        columns,
        rows: rowsOf(args.action, args.spec.key),
        addLabel,
        onChange: args.onChange,
    });
}

function textColumn(
    key: string,
    label: string,
    placeholder: string = label
): RowColumn {
    return {
        key,
        label,
        kind: ColumnKind.Text,
        placeholder,
    };
}

function nameColumn(
    args: FieldControlArguments,
    key: string,
    label: string
): RowColumn {
    const suggestions = args.spec.nameSuggestions;
    if (suggestions === undefined) {
        return textColumn(key, label);
    }

    return {
        key,
        label,
        kind: ColumnKind.Suggested,
        placeholder: label,
        suggestions,
    };
}

function codeInput(args: FieldControlArguments): HTMLElement {
    const textArea = FormControls.textArea({
        value: ActionReader.text(args.action, args.spec.key),
        rows: args.spec.rows ?? DefaultRows,
        placeholder: args.spec.placeholder ?? "",
        onInput: args.onChange,
    });

    return buildElement("div", {
        className: "code-field",
        children: [
            textArea,
            FormControls.button({
                text: "Format JSON",
                variant: ButtonVariants.Ghost,
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
    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }

    return args.spec.options?.[0]?.value ?? "";
}

const Builders: Record<FieldKind, FieldControlBuilder> = {
    [FieldKind.Text]: args => FormControls.textInput({
        value: ActionReader.text(args.action, args.spec.key),
        placeholder: args.spec.placeholder ?? "",
        onInput: args.onChange,
    }),
    [FieldKind.TextArea]: args => FormControls.textArea({
        value: ActionReader.text(args.action, args.spec.key),
        rows: args.spec.rows ?? DefaultRows,
        className: "input",
        placeholder: args.spec.placeholder ?? "",
        onInput: args.onChange,
    }),
    [FieldKind.Code]: codeInput,
    [FieldKind.Number]: args => {
        const input = FormControls.textInput({
            value: String(ActionReader.number(
                args.action,
                args.spec.key,
                args.spec.min ?? 0
            )),
            type: "number",
            onInput: value => args.onChange(Number(value)),
        });
        input.min = args.spec.min === undefined ? "" : String(args.spec.min);
        input.max = args.spec.max === undefined ? "" : String(args.spec.max);

        return input;
    },
    [FieldKind.Select]: args => FormControls.select({
        value: selectedValue(args),
        options: args.spec.options ?? [],
        onChange: args.onChange,
    }),
    [FieldKind.Checkbox]: args => FormControls.checkbox({
        checked: ActionReader.bool(
            args.action,
            args.spec.key,
            false
        ),
        label: args.spec.label,
        onChange: args.onChange,
    }),
    [FieldKind.Status]: args => new StatusCodeSelect(ActionReader.nullableNumber(args.action, args.spec.key), args.onChange).root,
    [FieldKind.Latency]: args => new LatencySlider(ActionReader.delay(args.action), args.onChange).root,
    [FieldKind.StringList]: args => FormControls.textInput({
        value: ActionReader.strings(args.action, args.spec.key).join(`${ListSeparator} `),
        placeholder: args.spec.placeholder ?? "",
        onInput: value => args.onChange(value
            .split(ListSeparator)
            .map(item => item.trim())
            .filter(item => item.length > 0)),
    }),
    [FieldKind.KeyValueList]: args => table(
        args,
        [
            nameColumn(
                args,
                "key",
                "Name"
            ),
            textColumn("value", "Value"),
        ],
        "Add row"
    ).root,
    [FieldKind.Operations]: args => table(
        args,
        [
            {
                key: "op",
                label: "Operation",
                kind: ColumnKind.Select,
                options: OperationOptions,
                defaultValue: OperationKinds.AddOrUpdate,
            },
            nameColumn(
                args,
                "name",
                args.spec.nameLabel ?? "Name"
            ),
            textColumn("value", "Value"),
        ],
        `Add ${(args.spec.nameLabel ?? "row").toLowerCase()}`
    ).root,
    [FieldKind.MediaType]: args => SuggestionInput.build({
        value: ActionReader.text(args.action, args.spec.key),
        placeholder: args.spec.placeholder ?? "",
        suggestions: CommonMediaTypes,
        onInput: args.onChange,
    }),
};

export const FieldControls = {
    build(args: FieldControlArguments): HTMLElement {
        const control = Builders[args.spec.kind](args);
        if (args.spec.kind === FieldKind.Checkbox) {
            return buildElement("div", {
                className: "field",
                children: [
                    control,
                    args.spec.hint === undefined
                        ? null
                        : buildElement("span", {
                            className: "field-hint",
                            text: args.spec.hint,
                        }),
                ],
            });
        }

        return FormControls.field(
            args.spec.label,
            control,
            args.spec.hint ?? null
        );
    },
};
