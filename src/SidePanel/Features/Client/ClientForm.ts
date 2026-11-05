import { CommonHeaderNames } from "../../../Contracts/Http/CommonHeaderNames";
import type { ClientExchangeRequest } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { FormControls } from "../../Core/Dom/FormControls";
import { SuggestionInput } from "../../Core/Dom/SuggestionInput";

const Methods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
];
const BodyRows = 10;

function headerRow(
    header: HeaderEntry,
    onChange: (header: HeaderEntry) => void,
    onRemove: () => void
): HTMLElement {
    const name = SuggestionInput.build({
        value: header.name,
        placeholder: "Header",
        suggestions: CommonHeaderNames,
        className: "input client-header-name",
        onInput: value => onChange({
            ...header,
            name: value,
        }),
    });
    const value = FormControls.textInput({
        value: header.value,
        placeholder: "Value",
        className: "input client-header-value",
        onInput: value => onChange({
            ...header,
            value,
        }),
    });
    const remove = FormControls.button({
        text: "×",
        title: "Remove header",
        onClick: onRemove,
    });

    return buildElement("div", {
        className: "client-header-row",
        children: [
            name,
            value,
            remove,
        ],
    });
}

export class ClientForm {
    readonly root: HTMLElement;

    private readonly _methodSelect: HTMLSelectElement;
    private readonly _urlInput: HTMLInputElement;
    private readonly _headersContainer: HTMLElement;
    private readonly _bodyInput: HTMLTextAreaElement;
    private readonly _request: ClientExchangeRequest;

    constructor(initial: ClientExchangeRequest) {
        this._request = {
            ...initial,
            headers: initial.headers.map(header => ({
                ...header,
            })),
        };
        this._methodSelect = FormControls.select({
            value: this._request.method,
            options: Methods.map(method => ({
                value: method,
                label: method,
            })),
            className: "input client-method",
            onChange: value => {
                this._request.method = value;
            },
        });
        this._urlInput = FormControls.textInput({
            value: this._request.url,
            placeholder: "https://api.example.com/users/42?page=1",
            className: "input client-url",
            onInput: value => {
                this._request.url = value;
            },
        });
        this._headersContainer = buildElement("div", {
            className: "client-headers",
        });
        this._bodyInput = FormControls.textArea({
            value: this._request.body,
            rows: BodyRows,
            placeholder: "Request body (sent for POST, PUT, PATCH, DELETE, OPTIONS)",
            onInput: value => {
                this._request.body = value;
            },
        });
        this.renderHeaders();

        this.root = buildElement("div", {
            className: "client-form",
            children: [
                buildElement("div", {
                    className: "client-line",
                    children: [
                        this._methodSelect,
                        this._urlInput,
                    ],
                }),
                buildElement("section", {
                    className: "client-section",
                    children: [
                        buildElement("h3", {
                            className: "client-section-title",
                            text: "Headers",
                        }),
                        this._headersContainer,
                        buildElement("div", {
                            className: "client-header-tools",
                            children: [
                                FormControls.button({
                                    text: "Add header",
                                    onClick: () => this.addHeader(),
                                }),
                            ],
                        }),
                    ],
                }),
                buildElement("section", {
                    className: "client-section",
                    children: [
                        buildElement("h3", {
                            className: "client-section-title",
                            text: "Body",
                        }),
                        this._bodyInput,
                    ],
                }),
            ],
        });
    }

    current(): ClientExchangeRequest {
        return {
            method: this._request.method,
            url: this._request.url,
            headers: this._request.headers.map(header => ({
                ...header,
            })),
            body: this._request.body,
        };
    }

    private addHeader(): void {
        this._request.headers.push({
            name: "",
            value: "",
        });
        this.renderHeaders();
    }

    private renderHeaders(): void {
        if (this._request.headers.length === 0) {
            this._request.headers.push({
                name: "",
                value: "",
            });
        }

        this._headersContainer.replaceChildren(...this._request.headers.map((header, index) => headerRow(
            header,
            next => {
                this._request.headers[index] = next;
            },
            () => {
                this._request.headers.splice(index, 1);
                this.renderHeaders();
            }
        )));
    }
}
