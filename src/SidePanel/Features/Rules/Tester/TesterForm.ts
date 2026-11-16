import { HeaderText } from '../../../../Common/Http/HeaderText';
import { RESOURCE_TYPE_OPTIONS } from '../../../../Common/Rules/Criteria/ResourceTypeOption';
import type { TesterInput, TesterResponse } from '../../../../Common/Rules/Engine/TesterInput';
import { HTTP_METHODS } from '../../../../Contracts/Http/HttpMethods';
import { buildElement } from '../../../Core/Dom/buildElement';
import { FormControls } from '../../../Core/Dom/FormControls';

const METHODS = [
    HTTP_METHODS.Get,
    HTTP_METHODS.Post,
    HTTP_METHODS.Put,
    HTTP_METHODS.Patch,
    HTTP_METHODS.Delete,
    HTTP_METHODS.Options,
];
const DEFAULT_RESOURCE_TYPE = 'Fetch';
const DEFAULT_STATUS = 200;
const HEADER_ROWS = 3;
const BODY_ROWS = 4;

export class TesterForm {
    readonly root: HTMLElement;

    private readonly _input: TesterInput;
    private readonly _onChange: () => void;

    constructor(url: string, onChange: () => void) {
        this._onChange = onChange;
        const response: TesterResponse = {
            status: DEFAULT_STATUS,
            headers: [],
            body: '',
        };
        this._input = {
            url,
            method: METHODS[0]!,
            headers: [],
            body: null,
            resourceType: DEFAULT_RESOURCE_TYPE,
            response,
        };

        this.root = buildElement('div', {
            className: 'tester-form',
            children: [
                FormControls.field({
                    label: 'URL',
                    control: FormControls.textInput({
                        value: url,
                        placeholder: 'https://api.example.com/users',
                        onInput: value => this.change(() => {
                            this._input.url = value;
                        }),
                    }),
                }),
                buildElement('div', {
                    className: 'field-row',
                    children: [
                        FormControls.select({
                            value: this._input.method,
                            options: METHODS.map(method => ({
                                value: method,
                                label: method,
                            })),
                            onChange: value => this.change(() => {
                                this._input.method = value;
                            }),
                        }),
                        FormControls.select({
                            value: DEFAULT_RESOURCE_TYPE,
                            options: RESOURCE_TYPE_OPTIONS.map(option => ({
                                value: option.debuggerTypes[0] ?? option.label,
                                label: option.label,
                            })),
                            onChange: value => this.change(() => {
                                this._input.resourceType = value;
                            }),
                        }),
                    ],
                }),
                buildElement('details', {
                    className: 'tester-more',
                    children: [
                        buildElement('summary', {
                            text: 'Request headers, body and sample response',
                        }),
                        FormControls.field({
                            label: 'Request headers',
                            control: FormControls.textArea({
                                value: '',
                                rows: HEADER_ROWS,
                                placeholder: 'Accept: application/json',
                                onInput: value => this.change(() => {
                                    this._input.headers = HeaderText.parse(value);
                                }),
                            }),
                        }),
                        FormControls.field({
                            label: 'Request body',
                            control: FormControls.textArea({
                                value: '',
                                rows: BODY_ROWS,
                                onInput: value => this.change(() => {
                                    this._input.body = value === '' ? null : value;
                                }),
                            }),
                        }),
                        FormControls.field({
                            label: 'Response status',
                            control: FormControls.textInput({
                                value: String(DEFAULT_STATUS),
                                type: 'number',
                                onInput: value => this.change(() => {
                                    const status = Number(value);
                                    response.status = status === 0 || Number.isNaN(status)
                                        ? DEFAULT_STATUS
                                        : status;
                                }),
                            }),
                        }),
                        FormControls.field({
                            label: 'Response headers',
                            control: FormControls.textArea({
                                value: '',
                                rows: HEADER_ROWS,
                                placeholder: 'Content-Type: application/json',
                                onInput: value => this.change(() => {
                                    response.headers = HeaderText.parse(value);
                                }),
                            }),
                        }),
                        FormControls.field({
                            label: 'Response body',
                            control: FormControls.textArea({
                                value: '',
                                rows: BODY_ROWS,
                                onInput: value => this.change(() => {
                                    response.body = value;
                                }),
                            }),
                        }),
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
