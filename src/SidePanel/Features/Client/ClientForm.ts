import { RequestSnippets } from "../../../Common/CodeGen/RequestSnippets";
import { HeaderSuggestions } from "../../../Common/Http/HeaderSuggestions";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { FormControls, type SelectOption } from "../../Core/Dom/FormControls";
import { SuggestionInput } from "../../Core/Dom/SuggestionInput";
import { ClientBodyEditor } from "./ClientBodyEditor";
import type { ClientRequest } from "./ClientRequest";
import { ClientRequestDraft } from "./ClientRequestDraft";
import { ClientRowGrid } from "./ClientRowGrid";

const Methods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
];
const PlainTextType = "text/plain";

export interface ClientFormArguments {
    initial: ClientRequest;
    onPasteFilled: () => void;
}

function emptyHeader(): HeaderEntry {
    return {
        name: "",
        value: "",
    };
}

function methodOptionsFor(method: string): SelectOption[] {
    const methods = Methods.includes(method)
        ? Methods
        : [
            ...Methods,
            method,
        ];

    return methods.map(value => ({
        value,
        label: value,
    }));
}

function section(title: string, content: HTMLElement): HTMLElement {
    return buildElement("section", {
        className: "client-section",
        children: [
            buildElement("h3", {
                className: "client-section-title",
                text: title,
            }),
            content,
        ],
    });
}

export class ClientForm {
    readonly root: HTMLElement;

    private readonly _urlInput: HTMLInputElement;
    private readonly _headers: ClientRowGrid<HeaderEntry>;
    private readonly _body: ClientBodyEditor;
    private _method: string;
    private _methodSelect: HTMLSelectElement;

    constructor(args: ClientFormArguments) {
        this._method = args.initial.method;
        this._methodSelect = this.methodSelect();
        this._urlInput = FormControls.textInput({
            value: args.initial.url,
            placeholder: "URL, cURL or Wget",
            className: "input client-url",
        });
        this._urlInput.setAttribute("aria-label", "URL");
        this._urlInput.addEventListener("paste", event => {
            const snippet = RequestSnippets.parse(event.clipboardData?.getData(PlainTextType) ?? "");
            if (snippet === null) {
                return;
            }

            event.preventDefault();
            this.fill(ClientRequestDraft.fromSnippet(snippet));
            args.onPasteFilled();
        });
        const line = buildElement("div", {
            className: "client-line",
            children: [
                this._methodSelect,
                this._urlInput,
            ],
        });
        this._headers = new ClientRowGrid<HeaderEntry>({
            rows: args.initial.headers.map(header => ({
                ...header,
            })),
            addLabel: "Add header",
            removeLabel: "Remove header",
            keepsOneRow: true,
            emptyRow: emptyHeader,
            cellsOf: header => ({
                name: SuggestionInput.build({
                    value: header.name,
                    placeholder: "Header",
                    label: "Header name",
                    suggestions: HeaderSuggestions.names(),
                    wrapperClassName: "client-row-name",
                    onInput: value => {
                        header.name = value;
                    },
                }),
                value: SuggestionInput.build({
                    value: header.value,
                    placeholder: "Value",
                    label: "Header value",
                    suggestions: () => HeaderSuggestions.valuesFor(header.name),
                    wrapperClassName: "client-row-value",
                    onInput: value => {
                        header.value = value;
                    },
                }),
            }),
        });
        this._body = new ClientBodyEditor(args.initial.body);

        this.root = buildElement("div", {
            className: "client-form",
            children: [
                line,
                section("Headers", this._headers.root),
                section("Body", this._body.root),
            ],
        });
    }

    current(): ClientRequest {
        return {
            method: this._method,
            url: this._urlInput.value,
            headers: this._headers
                .rows()
                .map(header => ({
                    ...header,
                })),
            body: this._body.current(),
        };
    }

    fill(request: ClientRequest): void {
        this.useMethod(request.method.toUpperCase());
        this._urlInput.value = request.url;
        this._headers.setRows(request.headers.map(header => ({
            ...header,
        })));
        this._body.fill(request.body);
    }

    private useMethod(method: string): void {
        this._method = method;
        const select = this.methodSelect();
        this._methodSelect.replaceWith(select);
        this._methodSelect = select;
    }

    private methodSelect(): HTMLSelectElement {
        const select = FormControls.select({
            value: this._method,
            options: methodOptionsFor(this._method),
            className: "input client-method",
            onChange: value => {
                this._method = value;
            },
        });
        select.setAttribute("aria-label", "Method");

        return select;
    }
}
