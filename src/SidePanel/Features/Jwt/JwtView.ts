import { JwtClaims, JwtValidity } from "../../../Common/Jwt/JwtClaims";
import { type DecodedJwt, JwtToken } from "../../../Common/Jwt/JwtToken";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { FormControls } from "../../Core/Dom/FormControls";
import { UtcText } from "../../Core/Formatting/UtcText";
import type { JwtLaunchRequest } from "../../Core/ViewLaunchRequests";
import type { PanelContext } from "../Shell/PanelContext";
import { JwtStatusText } from "./JwtStatusText";

const TokenRows = 5;
const JsonIndentation = 2;

const ValidityClasses: Record<JwtValidity, string> = {
    [JwtValidity.Valid]: "status-ok",
    [JwtValidity.Expired]: "status-server-error",
    [JwtValidity.NotYetValid]: "status-client-error",
    [JwtValidity.NoExpiry]: "status-redirect",
};

function jsonBlock(title: string, value: object): HTMLElement {
    return buildElement("section", {
        className: "client-section",
        children: [
            buildElement("h3", {
                className: "client-section-title",
                text: title,
            }),
            buildElement("pre", {
                className: "code-block wrap",
                text: JSON.stringify(
                    value,
                    null,
                    JsonIndentation
                ),
            }),
        ],
    });
}

function timesOf(decoded: DecodedJwt): HTMLElement | null {
    const times = JwtClaims.timesOf(decoded.payload);
    if (times.length === 0) {
        return null;
    }

    return buildElement("dl", {
        className: "definitions",
        children: times.flatMap(time => [
            buildElement("dt", {
                text: time.label,
            }),
            buildElement("dd", {
                text: UtcText.of(time.at),
            }),
        ]),
    });
}

export class JwtView {
    readonly root: HTMLElement;

    private readonly _input: HTMLTextAreaElement;
    private readonly _output: HTMLElement;

    constructor(context: PanelContext) {
        this._input = FormControls.textArea({
            value: "",
            rows: TokenRows,
            className: "input code-input jwt-input",
            placeholder: "Paste a JWT, with or without the Bearer prefix",
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

        const now = new Date();
        this._output.replaceChildren(
            buildElement("p", {
                className: `status ${ValidityClasses[JwtClaims.validityOf(decoded.value.payload, now)]}`,
                text: JwtStatusText.of(decoded.value.payload, now),
            }),
            timesOf(decoded.value) ?? "",
            jsonBlock("Header", decoded.value.header),
            jsonBlock("Claims", decoded.value.payload)
        );
    }
}
