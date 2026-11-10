import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls, type SelectOption } from "../../../Core/Dom/FormControls";
import { SuggestionInput } from "../../../Core/Dom/SuggestionInput";

export enum ColumnKind {
    Text = 1,
    Number = 2,
    Select = 3,
    Suggested = 4,
}

export interface RowColumn {
    key: string;
    label: string;
    kind: ColumnKind;
    placeholder?: string;
    options?: SelectOption[];
    suggestions?: readonly string[];
    suggestionsOf?: (row: TableRow) => readonly string[];
    defaultValue?: string;
}

export type TableRow = Record<string, string | number>;

export interface RowTableArguments {
    columns: RowColumn[];
    rows: TableRow[];
    addLabel: string;
    onChange: (rows: TableRow[]) => void;
}

function emptyRow(columns: RowColumn[]): TableRow {
    return Object.fromEntries(columns.map(column => [
        column.key,
        column.kind === ColumnKind.Number ? 0 : column.defaultValue ?? column.options?.[0]?.value ?? "",
    ]));
}

interface CellArguments {
    column: RowColumn;
    row: TableRow;
    value: string | number;
    onChange: (value: string | number) => void;
}

const CellBuilders: Record<ColumnKind, (args: CellArguments) => HTMLElement> = {
    [ColumnKind.Text]: args => FormControls.textInput({
        value: String(args.value),
        placeholder: args.column.placeholder ?? args.column.label,
        onInput: args.onChange,
    }),
    [ColumnKind.Number]: args => FormControls.textInput({
        value: String(args.value),
        type: "number",
        placeholder: args.column.placeholder ?? args.column.label,
        onInput: next => args.onChange(Number(next)),
    }),
    [ColumnKind.Select]: args => FormControls.select({
        value: String(args.value),
        options: args.column.options ?? [],
        onChange: args.onChange,
    }),
    [ColumnKind.Suggested]: args => SuggestionInput.build({
        value: String(args.value),
        placeholder: args.column.placeholder ?? args.column.label,
        suggestions: () => args.column.suggestionsOf?.(args.row) ?? args.column.suggestions ?? [],
        onInput: args.onChange,
    }),
};

export class RowTable {
    readonly root: HTMLElement;

    private readonly _arguments: RowTableArguments;
    private readonly _body: HTMLElement;
    private _rows: TableRow[];

    constructor(args: RowTableArguments) {
        this._arguments = args;
        this._rows = args.rows.map(row => ({
            ...row,
        }));
        this._body = buildElement("tbody");

        this.root = buildElement("div", {
            className: "row-table",
            children: [
                buildElement("table", {
                    className: "grid",
                    children: [
                        buildElement("thead", {
                            children: [
                                buildElement("tr", {
                                    children: [
                                        ...args.columns.map(column => buildElement("th", {
                                            text: column.label,
                                        })),
                                        buildElement("th", {
                                            attributes: {
                                                "aria-label": "Actions",
                                            },
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        this._body,
                    ],
                }),
                FormControls.button({
                    text: args.addLabel,
                    variant: ButtonVariants.Ghost,
                    onClick: () => {
                        this._rows = [
                            ...this._rows,
                            emptyRow(args.columns),
                        ];
                        this.render();
                        this.publish();
                    },
                }),
            ],
        });
        this.render();
    }

    setRows(rows: TableRow[]): void {
        this._rows = rows.map(row => ({
            ...row,
        }));
        this.render();
        this.publish();
    }

    private render(): void {
        this._body.replaceChildren(...this._rows.map((row, index) => buildElement("tr", {
            children: [
                ...this._arguments.columns.map(column => buildElement("td", {
                    children: [
                        CellBuilders[column.kind]({
                            column,
                            row,
                            value: row[column.key] ?? "",
                            onChange: value => {
                                row[column.key] = value;
                                this.publish();
                            },
                        }),
                    ],
                })),
                buildElement("td", {
                    children: [
                        FormControls.button({
                            text: "Remove",
                            variant: ButtonVariants.Ghost,
                            onClick: () => {
                                this._rows = this._rows.filter((_, rowIndex) => rowIndex !== index);
                                this.render();
                                this.publish();
                            },
                        }),
                    ],
                }),
            ],
        })));
    }

    private publish(): void {
        this._arguments.onChange(this._rows.map(row => ({
            ...row,
        })));
    }
}
