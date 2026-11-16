import { JsonText } from '../../../Common/Json/JsonText';
import { XmlText } from '../../../Common/Xml/XmlText';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import type { ClientBody } from './ClientBody';
import { CLIENT_BODY_TYPE, type ClientBodyType } from './ClientBodyType';
import { ClientRowGrid } from './ClientRowGrid';
import type { KeyValueRow } from './KeyValueRow';
import type { MultipartRow } from './MultipartRow';

interface BodyTab {
    type: ClientBodyType;
    label: string;
}

const BODY_TABS: BodyTab[] = [
    {
        type: CLIENT_BODY_TYPE.None,
        label: 'None',
    },
    {
        type: CLIENT_BODY_TYPE.Text,
        label: 'Text',
    },
    {
        type: CLIENT_BODY_TYPE.Json,
        label: 'JSON',
    },
    {
        type: CLIENT_BODY_TYPE.Xml,
        label: 'XML',
    },
    {
        type: CLIENT_BODY_TYPE.FormUrlEncoded,
        label: 'Form URL-encoded',
    },
    {
        type: CLIENT_BODY_TYPE.Multipart,
        label: 'Multipart form',
    },
    {
        type: CLIENT_BODY_TYPE.Binary,
        label: 'Binary',
    },
    {
        type: CLIENT_BODY_TYPE.GraphQl,
        label: 'GraphQL',
    },
];

const FORMATTERS: Partial<Record<ClientBodyType, (text: string) => string>> = {
    [CLIENT_BODY_TYPE.Json]: JsonText.format,
    [CLIENT_BODY_TYPE.Xml]: XmlText.format,
};

const PART_KINDS = Object.freeze({
    Text: 'text',
    File: 'file',
} as const);

const EDITOR_ROWS = 10;

interface TextInputOptions {
    value: string;
    placeholder: string;
    onInput: (value: string) => void;
}

function textInput({ value, placeholder, onInput }: TextInputOptions): HTMLInputElement {
    return FormControls.textInput({
        value,
        placeholder,
        onInput,
    });
}

interface FilePickerOptions {
    fileName: string;
    hasFile: boolean;
    onPick: (file: File | null) => void;
}

function filePicker({ fileName, hasFile, onPick }: FilePickerOptions): HTMLElement {
    const input = buildElement('input', {
        className: 'input client-file',
        attributes: {
            type: 'file',
            'aria-label': 'File',
        },
    });
    const hint = buildElement('span', {
        className: 'client-file-hint',
        text: `Pick ${fileName}`,
    });
    hint.hidden = hasFile || fileName === '';
    input.addEventListener(
        /* type: */ 'change',
        /* listener: */ () => {
            const file = input.files?.[0] ?? null;
            hint.hidden = file != null || fileName === '';
            onPick(file);
        },
    );

    return buildElement('span', {
        className: 'client-file-picker',
        children: [
            input,
            hint,
        ],
    });
}

function emptyKeyValue(): KeyValueRow {
    return {
        name: '',
        value: '',
    };
}

function emptyPart(): MultipartRow {
    return {
        name: '',
        value: '',
        isFile: false,
        file: null,
        fileName: '',
    };
}

export class ClientBodyEditor {
    readonly root: HTMLElement;

    private readonly _tabButtons = new Map<ClientBodyType, HTMLButtonElement>();
    private readonly _editor: HTMLElement;
    private _body: ClientBody;

    constructor(body: ClientBody) {
        this._body = body;
        this._editor = buildElement('div', {
            className: 'client-body-editor',
        });
        const tabBar = buildElement('nav', {
            className: 'inspector-tabs client-body-tabs',
            attributes: {
                role: 'tablist',
                'aria-label': 'Body type',
            },
            children: BODY_TABS.map(tab => {
                const button = buildElement('button', {
                    className: 'tab',
                    text: tab.label,
                    attributes: {
                        type: 'button',
                        role: 'tab',
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

        this.root = buildElement('div', {
            className: 'client-body',
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
        this._tabButtons.forEach((button, type) => button.setAttribute(
            /* qualifiedName: */ 'aria-selected',
            /* value: */ String(type === this._body.type),
        ));
        this._editor.replaceChildren(this.editorOf(this._body.type));
    }

    private editorOf(type: ClientBodyType): HTMLElement {
        const editors: Record<ClientBodyType, () => HTMLElement> = {
            [CLIENT_BODY_TYPE.None]: () => buildElement('p', {
                className: 'empty-note',
                text: 'This request has no body.',
            }),
            [CLIENT_BODY_TYPE.Text]: () => this.textEditor(type),
            [CLIENT_BODY_TYPE.Json]: () => this.textEditor(type),
            [CLIENT_BODY_TYPE.Xml]: () => this.textEditor(type),
            [CLIENT_BODY_TYPE.FormUrlEncoded]: () => this.formEditor(),
            [CLIENT_BODY_TYPE.Multipart]: () => this.multipartEditor(),
            [CLIENT_BODY_TYPE.Binary]: () => filePicker({
                fileName: this._body.fileName,
                hasFile: this._body.file != null,
                onPick: file => {
                    this._body.file = file;
                    this._body.fileName = file?.name ?? this._body.fileName;
                },
            }),
            [CLIENT_BODY_TYPE.GraphQl]: () => FormControls.textArea({
                value: this._body.graphQlQuery,
                rows: EDITOR_ROWS,
                className: 'input code-input',
                placeholder: 'query { users { id } }',
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
            rows: EDITOR_ROWS,
            className: 'input code-input',
            onInput: value => {
                this._body.text = value;
            },
        });
        const formatter = FORMATTERS[type];
        if (formatter == null) {
            return area;
        }

        return buildElement('div', {
            className: 'code-field',
            children: [
                area,
                FormControls.button({
                    text: 'Format',
                    variant: BUTTON_VARIANTS.Ghost,
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
            addLabel: 'Add field',
            removeLabel: 'Remove field',
            emptyRow: emptyKeyValue,
            cellsOf: row => ({
                name: textInput({
                    value: row.name,
                    placeholder: 'Name',
                    onInput: value => {
                        row.name = value;
                    },
                }),
                value: textInput({
                    value: row.value,
                    placeholder: 'Value',
                    onInput: value => {
                        row.value = value;
                    },
                }),
            }),
        }).root;
    }

    private multipartEditor(): HTMLElement {
        return new ClientRowGrid<MultipartRow>({
            rows: this._body.multipartRows,
            addLabel: 'Add field',
            removeLabel: 'Remove field',
            emptyRow: emptyPart,
            cellsOf: (row, rerender) => ({
                name: textInput({
                    value: row.name,
                    placeholder: 'Name',
                    onInput: value => {
                        row.name = value;
                    },
                }),
                value: buildElement('span', {
                    className: 'client-part-value',
                    children: [
                        FormControls.select({
                            value: row.isFile ? PART_KINDS.File : PART_KINDS.Text,
                            className: 'input client-part-kind',
                            options: [
                                {
                                    value: PART_KINDS.Text,
                                    label: 'Text',
                                },
                                {
                                    value: PART_KINDS.File,
                                    label: 'File',
                                },
                            ],
                            onChange: value => {
                                row.isFile = value === PART_KINDS.File;
                                rerender();
                            },
                        }),
                        row.isFile
                            ? filePicker({
                                fileName: row.fileName,
                                hasFile: row.file != null,
                                onPick: file => {
                                    row.file = file;
                                    row.fileName = file?.name ?? row.fileName;
                                },
                            })
                            : textInput({
                                value: row.value,
                                placeholder: 'Value',
                                onInput: value => {
                                    row.value = value;
                                },
                            }),
                    ],
                }),
            }),
        }).root;
    }
}
