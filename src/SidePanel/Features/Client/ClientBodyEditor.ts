import { JsonText } from "../../../Common/Json/JsonText";
import { XmlText } from "../../../Common/Xml/XmlText";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { type ClientBody, ClientBodyType, type KeyValueRow, type MultipartRow } from "./ClientRequest";
import { ClientRowGrid } from "./ClientRowGrid";

interface BodyTab {
    type: ClientBodyType;
    label: string;
}

const BodyTabs: BodyTab[] = [
    {
        type: ClientBodyType.None,
        label: "None",
    },
    {
        type: ClientBodyType.Text,
        label: "Text",
    },
    {
        type: ClientBodyType.Json,
        label: "JSON",
    },
    {
        type: ClientBodyType.Xml,
        label: "XML",
    },
    {
        type: ClientBodyType.FormUrlEncoded,
        label: "Form URL-encoded",
    },
    {
        type: ClientBodyType.Multipart,
        label: "Multipart form",
    },
    {
        type: ClientBodyType.Binary,
        label: "Binary",
    },
    {
        type: ClientBodyType.GraphQl,
        label: "GraphQL",
    },
];

const Formatters: Partial<Record<ClientBodyType, (text: string) => string>> = {
    [ClientBodyType.Json]: JsonText.format,
    [ClientBodyType.Xml]: XmlText.format,
};

const PartKinds = {
    Text: "text",
    File: "file",
} as const;

const EditorRows = 10;

function textInput(
    value: string,
    placeholder: string,
    onInput: (value: string) => void
): HTMLInputElement {
    return FormControls.textInput({
        value,
        placeholder,
        onInput,
    });
}

function filePicker(
    fileName: string,
    hasFile: boolean,
    onPick: (file: File | null) => void
): HTMLElement {
    const input = buildElement("input", {
        className: "input client-file",
        attributes: {
            type: "file",
            "aria-label": "File",
        },
    });
    const hint = buildElement("span", {
        className: "muted client-file-hint",
        text: `Pick ${fileName}`,
    });
    hint.hidden = hasFile || fileName === "";
    input.addEventListener("change", () => {
        const file = input.files?.[0] ?? null;
        hint.hidden = file !== null || fileName === "";
        onPick(file);
    });

    return buildElement("span", {
        className: "client-file-picker",
        children: [
            input,
            hint,
        ],
    });
}

function emptyKeyValue(): KeyValueRow {
    return {
        name: "",
        value: "",
    };
}

function emptyPart(): MultipartRow {
    return {
        name: "",
        value: "",
        isFile: false,
        file: null,
        fileName: "",
    };
}

export class ClientBodyEditor {
    readonly root: HTMLElement;

    private readonly _tabButtons = new Map<ClientBodyType, HTMLButtonElement>();
    private readonly _editor: HTMLElement;
    private _body: ClientBody;

    constructor(body: ClientBody) {
        this._body = body;
        this._editor = buildElement("div", {
            className: "client-body-editor",
        });
        const tabBar = buildElement("nav", {
            className: "inspector-tabs client-body-tabs",
            attributes: {
                role: "tablist",
                "aria-label": "Body type",
            },
            children: BodyTabs.map(tab => {
                const button = buildElement("button", {
                    className: "tab",
                    text: tab.label,
                    attributes: {
                        type: "button",
                        role: "tab",
                    },
                    listeners: {
                        click: () => {
                            this._body.type = tab.type;
                            this.render();
                        },
                    },
                });
                this._tabButtons.set(tab.type, button);

                return button;
            }),
        });

        this.root = buildElement("div", {
            className: "client-body",
            children: [
                tabBar,
                this._editor,
            ],
        });
        this.render();
    }

    current(): ClientBody {
        return {
            ...this._body,
            formRows: this._body.formRows.map(row => ({
                ...row,
            })),
            multipartRows: this._body.multipartRows.map(row => ({
                ...row,
            })),
        };
    }

    fill(body: ClientBody): void {
        this._body = body;
        this.render();
    }

    private render(): void {
        this._tabButtons.forEach((button, type) => button.setAttribute("aria-selected", String(type === this._body.type)));
        this._editor.replaceChildren(this.editorOf(this._body.type));
    }

    private editorOf(type: ClientBodyType): HTMLElement {
        const editors: Record<ClientBodyType, () => HTMLElement> = {
            [ClientBodyType.None]: () => buildElement("p", {
                className: "muted",
                text: "This request has no body.",
            }),
            [ClientBodyType.Text]: () => this.textEditor(type),
            [ClientBodyType.Json]: () => this.textEditor(type),
            [ClientBodyType.Xml]: () => this.textEditor(type),
            [ClientBodyType.FormUrlEncoded]: () => this.formEditor(),
            [ClientBodyType.Multipart]: () => this.multipartEditor(),
            [ClientBodyType.Binary]: () => filePicker(
                this._body.fileName,
                this._body.file !== null,
                file => {
                    this._body.file = file;
                    this._body.fileName = file?.name ?? this._body.fileName;
                }
            ),
            [ClientBodyType.GraphQl]: () => FormControls.textArea({
                value: this._body.graphQlQuery,
                rows: EditorRows,
                className: "input code-input",
                placeholder: "query { users { id name } }",
                onInput: value => {
                    this._body.graphQlQuery = value;
                },
            }),
        };

        return editors[type]();
    }

    private textEditor(type: ClientBodyType): HTMLElement {
        const area = FormControls.textArea({
            value: this._body.text,
            rows: EditorRows,
            className: "input code-input",
            onInput: value => {
                this._body.text = value;
            },
        });
        const formatter = Formatters[type];
        if (formatter === undefined) {
            return area;
        }

        return buildElement("div", {
            className: "code-field",
            children: [
                area,
                FormControls.button({
                    text: "Format",
                    variant: ButtonVariants.Ghost,
                    onClick: () => {
                        area.value = formatter(area.value);
                        this._body.text = area.value;
                    },
                }),
            ],
        });
    }

    private formEditor(): HTMLElement {
        return new ClientRowGrid<KeyValueRow>({
            rows: this._body.formRows,
            addLabel: "Add field",
            removeLabel: "Remove field",
            keepsOneRow: true,
            emptyRow: emptyKeyValue,
            cellsOf: row => ({
                name: textInput(
                    row.name,
                    "Name",
                    value => {
                        row.name = value;
                    }
                ),
                value: textInput(
                    row.value,
                    "Value",
                    value => {
                        row.value = value;
                    }
                ),
            }),
        }).root;
    }

    private multipartEditor(): HTMLElement {
        return new ClientRowGrid<MultipartRow>({
            rows: this._body.multipartRows,
            addLabel: "Add field",
            removeLabel: "Remove field",
            keepsOneRow: true,
            emptyRow: emptyPart,
            cellsOf: (row, rerender) => ({
                name: textInput(
                    row.name,
                    "Name",
                    value => {
                        row.name = value;
                    }
                ),
                value: buildElement("span", {
                    className: "client-part-value",
                    children: [
                        FormControls.select({
                            value: row.isFile ? PartKinds.File : PartKinds.Text,
                            className: "input client-part-kind",
                            options: [
                                {
                                    value: PartKinds.Text,
                                    label: "Text",
                                },
                                {
                                    value: PartKinds.File,
                                    label: "File",
                                },
                            ],
                            onChange: value => {
                                row.isFile = value === PartKinds.File;
                                rerender();
                            },
                        }),
                        row.isFile
                            ? filePicker(
                                row.fileName,
                                row.file !== null,
                                file => {
                                    row.file = file;
                                    row.fileName = file?.name ?? row.fileName;
                                }
                            )
                            : textInput(
                                row.value,
                                "Value",
                                value => {
                                    row.value = value;
                                }
                            ),
                    ],
                }),
            }),
        }).root;
    }
}
