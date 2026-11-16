import { JsonText } from '../../../Common/Json/JsonText';
import { JwtClaims } from '../../../Common/Jwt/JwtClaims';
import type { JwtObject } from '../../../Common/Jwt/JwtObject';
import { type DecodedJwt, JwtToken } from '../../../Common/Jwt/JwtToken';
import { JWT_VALIDITY, type JwtValidity } from '../../../Common/Jwt/JwtValidity';
import { buildElement } from '../../Core/Dom/buildElement';
import { FormControls } from '../../Core/Dom/FormControls';
import type { JwtLaunchRequest } from '../../Core/ViewLaunchRequests/JwtLaunchRequest';
import type { PanelContext } from '../Shell/PanelContext';
import { type JwtField, JwtFields } from './JwtFields';
import { JwtStatusText } from './JwtStatusText';

const TOKEN_ROWS = 5;
const NONE_TEXT = 'None.';

const JWT_VIEW_MODE = Object.freeze({
    List: 1,
    Raw: 2,
} as const);

type JwtViewMode = (typeof JWT_VIEW_MODE)[keyof typeof JWT_VIEW_MODE];

const VALIDITY_CLASSES: Record<JwtValidity, string> = Object.freeze({
    [JWT_VALIDITY.Valid]: 'status-ok',
    [JWT_VALIDITY.Expired]: 'status-server-error',
    [JWT_VALIDITY.NotYetValid]: 'status-client-error',
    [JWT_VALIDITY.NoExpiry]: 'status-redirect',
});

type PartRenderer = (part: JwtObject) => HTMLElement;

function fieldList(fields: JwtField[], className: string): HTMLElement {
    return buildElement('dl', {
        className,
        children: fields.flatMap(field => [
            buildElement('dt', {
                text: field.name,
            }),
            buildElement('dd', {
                className: 'jwt-field-value',
                children: field.children.length === 0
                    ? [field.value]
                    : [fieldList(field.children, 'definitions nested-definitions')],
            }),
        ]),
    });
}

function listOf(part: JwtObject): HTMLElement {
    const fields = JwtFields.of(part);
    if (fields.length === 0) {
        return buildElement('p', {
            className: 'empty-note',
            text: NONE_TEXT,
        });
    }

    return fieldList(fields, 'definitions');
}

function rawOf(part: JwtObject): HTMLElement {
    return buildElement('pre', {
        className: 'code-block',
        attributes: { 'data-wrap': '' },
        text: JsonText.stringify(part),
    });
}

const PART_RENDERERS: Record<JwtViewMode, PartRenderer> = {
    [JWT_VIEW_MODE.List]: listOf,
    [JWT_VIEW_MODE.Raw]: rawOf,
};

interface PartBlockOptions {
    title: string;
    part: JwtObject;
    render: PartRenderer;
}

function partBlock({ title, part, render }: PartBlockOptions): HTMLElement {
    return buildElement('section', {
        className: 'client-section jwt-part',
        children: [
            buildElement('h3', {
                className: 'client-section-title',
                text: title,
            }),
            render(part),
        ],
    });
}

export class JwtView {
    readonly root: HTMLElement;

    private readonly _input: HTMLTextAreaElement;
    private readonly _output: HTMLElement;
    private _mode: JwtViewMode = JWT_VIEW_MODE.List;

    constructor(context: PanelContext) {
        this._input = FormControls.textArea({
            value: '',
            rows: TOKEN_ROWS,
            className: 'input code-input jwt-input',
            placeholder: 'Paste a JWT',
            onInput: () => this.render(),
        });
        this._input.setAttribute('aria-label', 'JWT');
        this._output = buildElement('div', {
            className: 'jwt-output',
        });

        this.root = buildElement('section', {
            className: 'jwt-view',
            children: [
                buildElement('div', {
                    className: 'view-header',
                    children: [
                        buildElement('h2', {
                            text: 'JWT',
                        }),
                    ],
                }),
                this._input,
                this._output,
            ],
        });
        this.render();

        context.store.select({
            selector: state => state.jwtLaunch,
            listener: launch => this.open(launch),
        });
    }

    private open(launch: JwtLaunchRequest | null): void {
        if (launch == null) {
            return;
        }

        this._input.value = JwtToken.clean(launch.token);
        this.render();
    }

    private render(): void {
        const text = this._input.value;
        if (text.trim() === '') {
            this._output.replaceChildren(buildElement('p', {
                className: 'help-text',
                text: 'The header and claims show here. The token never leaves the panel.',
            }));

            return;
        }

        const decoded = JwtToken.decode(text);
        if (decoded.hasErrors) {
            this._output.replaceChildren(buildElement('p', {
                className: 'form-error',
                text: decoded.error,
            }));

            return;
        }

        this._output.replaceChildren(...this.decodedParts(decoded.value));
    }

    private decodedParts(decoded: DecodedJwt): HTMLElement[] {
        const now = new Date();
        const render = PART_RENDERERS[this._mode];

        return [
            buildElement('p', {
                className: `status ${VALIDITY_CLASSES[JwtClaims.validityOf(decoded.payload, now)]}`,
                text: JwtStatusText.of(decoded.payload, now),
            }),
            this.modeSelect(),
            partBlock({ title: 'Header', part: decoded.header, render }),
            partBlock({ title: 'Claims', part: decoded.payload, render }),
        ];
    }

    private modeSelect(): HTMLElement {
        const select = FormControls.select({
            value: String(this._mode),
            className: 'input jwt-mode',
            options: [
                {
                    value: String(JWT_VIEW_MODE.List),
                    label: 'List',
                },
                {
                    value: String(JWT_VIEW_MODE.Raw),
                    label: 'Raw',
                },
            ],
            onChange: value => {
                this._mode = Number(value) as JwtViewMode;
                this.render();
            },
        });
        select.setAttribute('aria-label', 'Show the header and claims as');

        return buildElement('div', {
            className: 'body-tools',
            children: [select],
        });
    }
}
