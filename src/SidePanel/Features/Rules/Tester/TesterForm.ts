import { HeaderText } from "../../../../Common/Http/HeaderText";
import { ResourceTypeOptions } from "../../../../Common/Rules/Criteria/ResourceTypes";
import type { TesterInput } from "../../../../Common/Rules/Engine/RuleTester";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { FormControls } from "../../../Core/Dom/FormControls";

const Methods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
];
const DefaultResourceType = "Fetch";
const DefaultStatus = 200;
const HeaderRows = 3;
const BodyRows = 4;

export class TesterForm {
    readonly root: HTMLElement;

    private readonly _input: TesterInput;
    private readonly _onChange: () => void;

    constructor(url: string, onChange: () => void) {
        this._onChange = onChange;
        this._input = {
            url,
            method: Methods[0]!,
            headers: [],
            body: null,
            resourceType: DefaultResourceType,
            response: {
                status: DefaultStatus,
                headers: [],
                body: "",
            },
        };

        const response = this._input.response!;
        this.root = buildElement("div", {
            className: "tester-form",
            children: [
                FormControls.field(
                    "URL",
                    FormControls.textInput({
                        value: url,
                        placeholder: "https://api.example.com/users",
                        onInput: value => this.change(() => {
                            this._input.url = value;
                        }),
                    })
                ),
                buildElement("div", {
                    className: "field-row",
                    children: [
                        FormControls.select({
                            value: this._input.method,
                            options: Methods.map(method => ({
                                value: method,
                                label: method,
                            })),
                            onChange: value => this.change(() => {
                                this._input.method = value;
                            }),
                        }),
                        FormControls.select({
                            value: DefaultResourceType,
                            options: ResourceTypeOptions.map(option => ({
                                value: option.debuggerTypes[0] ?? option.label,
                                label: option.label,
                            })),
                            onChange: value => this.change(() => {
                                this._input.resourceType = value;
                            }),
                        }),
                    ],
                }),
                buildElement("details", {
                    className: "tester-more",
                    children: [
                        buildElement("summary", {
                            text: "Request headers, body and sample response",
                        }),
                        FormControls.field(
                            "Request headers",
                            FormControls.textArea({
                                value: "",
                                rows: HeaderRows,
                                placeholder: "Accept: application/json",
                                onInput: value => this.change(() => {
                                    this._input.headers = HeaderText.parse(value);
                                }),
                            })
                        ),
                        FormControls.field(
                            "Request body",
                            FormControls.textArea({
                                value: "",
                                rows: BodyRows,
                                onInput: value => this.change(() => {
                                    this._input.body = value === "" ? null : value;
                                }),
                            })
                        ),
                        FormControls.field(
                            "Response status",
                            FormControls.textInput({
                                value: String(DefaultStatus),
                                type: "number",
                                onInput: value => this.change(() => {
                                    response.status = Number(value) || DefaultStatus;
                                }),
                            })
                        ),
                        FormControls.field(
                            "Response headers",
                            FormControls.textArea({
                                value: "",
                                rows: HeaderRows,
                                placeholder: "Content-Type: application/json",
                                onInput: value => this.change(() => {
                                    response.headers = HeaderText.parse(value);
                                }),
                            })
                        ),
                        FormControls.field(
                            "Response body",
                            FormControls.textArea({
                                value: "",
                                rows: BodyRows,
                                onInput: value => this.change(() => {
                                    response.body = value;
                                }),
                            })
                        ),
                    ],
                }),
            ],
        });
    }

    input(): TesterInput {
        return structuredClone(this._input);
    }

    private change(apply: () => void): void {
        apply();
        this._onChange();
    }
}
