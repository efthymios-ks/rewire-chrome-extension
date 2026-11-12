import { JsonText } from "../../../Common/Json/JsonText";
import { JwtClaims, JwtValidity } from "../../../Common/Jwt/JwtClaims";
import { type DecodedJwt, type JwtObject, JwtToken } from "../../../Common/Jwt/JwtToken";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { FormControls } from "../../Core/Dom/FormControls";
import type { JwtLaunchRequest } from "../../Core/ViewLaunchRequests";
import type { PanelContext } from "../Shell/PanelContext";
import { type JwtField, JwtFields } from "./JwtFields";
import { JwtStatusText } from "./JwtStatusText";

const TokenRows = 5;
const NoneText = "None.";

export enum JwtViewMode {
    List = 1,
    Raw = 2,
}

const ValidityClasses: Record<JwtValidity, string> = {
    [JwtValidity.Valid]: "status-ok",
    [JwtValidity.Expired]: "status-server-error",
    [JwtValidity.NotYetValid]: "status-client-error",
    [JwtValidity.NoExpiry]: "status-redirect",
};

type PartRenderer = (part: JwtObject) => HTMLElement;

function fieldList(fields: JwtField[], className: string): HTMLElement {
    return buildElement("dl", {
        className,
        children: fields.flatMap(field => [
            buildElement("dt", {
                text: field.name,
            }),
            buildElement("dd", {
                className: "code-text",
                children: field.children.length === 0 ? [field.value] : [fieldList(field.children, "definitions nested-definitions")],
            }),
        ]),
    });
}

function listOf(part: JwtObject): HTMLElement {
    const fields = JwtFields.of(part);
    if (fields.length === 0) {
        return buildElement("p", {
            className: "muted",
            text: NoneText,
        });
    }

    return fieldList(fields, "definitions");
}

function rawOf(part: JwtObject): HTMLElement {
    return buildElement("pre", {
        className: "code-block wrap",
        text: JsonText.stringify(part),
    });
}

const PartRenderers: Record<JwtViewMode, PartRenderer> = {
    [JwtViewMode.List]: listOf,
    [JwtViewMode.Raw]: rawOf,
};

function partBlock(
    title: string,
    part: JwtObject,
    render: PartRenderer
): HTMLElement {
    return buildElement("section", {
        className: "client-section jwt-part",
        children: [
            buildElement("h3", {
                className: "client-section-title",
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
    private _mode = JwtViewMode.List;

    constructor(context: PanelContext) {
        this._input = FormControls.textArea({
            value: "",
            rows: TokenRows,
            className: "input code-input jwt-input",
            placeholder: "Paste a JWT",
            onInput: () => this.render(),
        });
        this._input.setAttribute("aria-label", "JWT");
        this._output = buildElement("div", {
            className: "jwt-output",
        });

        this.root = buildElement("section", {
            className: "jwt-view",
            children: [
                buildElement("div", {
                    className: "view-header",
                    children: [
                        buildElement("h2", {
                            text: "JWT",
                        }),
                    ],
                }),
                this._input,
                this._output,
            ],
        });
        this.render();

        context.store.select(
            state => state.jwtLaunch,
            launch => this.open(launch)
        );
    }

    private open(launch: JwtLaunchRequest | null): void {
        if (launch === null) {
            return;
        }

        this._input.value = JwtToken.clean(launch.token);
        this.render();
    }

    private render(): void {
        const text = this._input.value;
        if (text.trim() === "") {
            this._output.replaceChildren(buildElement("p", {
                className: "muted",
                text: "The header and claims show here. The token never leaves the panel.",
            }));

            return;
        }

        const decoded = JwtToken.decode(text);
        if (decoded.hasErrors) {
            this._output.replaceChildren(buildElement("p", {
                className: "form-error",
                text: decoded.error,
            }));

            return;
        }

        this._output.replaceChildren(...this.decodedParts(decoded.value));
    }

    private decodedParts(decoded: DecodedJwt): HTMLElement[] {
        const now = new Date();
        const render = PartRenderers[this._mode];

        return [
            buildElement("p", {
                className: `status ${ValidityClasses[JwtClaims.validityOf(decoded.payload, now)]}`,
                text: JwtStatusText.of(decoded.payload, now),
            }),
            this.modeSelect(),
            partBlock(
                "Header",
                decoded.header,
                render
            ),
            partBlock(
                "Claims",
                decoded.payload,
                render
            ),
        ];
    }

    private modeSelect(): HTMLElement {
        const select = FormControls.select({
            value: String(this._mode),
            className: "input jwt-mode",
            options: [
                {
                    value: String(JwtViewMode.List),
                    label: "List",
                },
                {
                    value: String(JwtViewMode.Raw),
                    label: "Raw",
                },
            ],
            onChange: value => {
                this._mode = Number(value) as JwtViewMode;
                this.render();
            },
        });
        select.setAttribute("aria-label", "Show the header and claims as");

        return buildElement("div", {
            className: "body-tools",
            children: [select],
        });
    }
}
