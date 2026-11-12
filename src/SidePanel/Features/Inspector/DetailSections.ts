import { JsonText } from "../../../Common/Json/JsonText";
import type { CookiePair } from "../../../Common/Rules/Http/CookieHeader";
import type { SetCookie } from "../../../Common/Rules/Http/SetCookieHeader";
import type { ChangeArea, ValueChange } from "../../../Contracts/Rules/ValueChange";
import type { SearchQuery } from "../../../Contracts/Search/SearchQuery";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { UtcText } from "../../Core/Formatting/UtcText";
import { buildElement, type ElementChild } from "../../Core/Dom/ElementBuilder";
import { FormControls } from "../../Core/Dom/FormControls";
import { BodyMode, CurrentInspectorPreferences } from "./InspectorPreferences";
import { JsonTreeView } from "./JsonTreeView";
import { TextHighlighter } from "./TextHighlighter";

const NoneText = "(none)";
const RemovedText = "(removed)";
const ModifiedText = "Modified";
const EmptyBodyText = "No body.";

export interface DefinitionAction {
    label: string;
    icon: string;
    run: () => void;
}

export interface DefinitionItem {
    term: string;
    value: string;
    change?: ValueChange | undefined;
    action?: DefinitionAction | undefined;
}

export type HeaderActionOf = (header: HeaderEntry) => DefinitionAction | undefined;

function valueChildren(item: DefinitionItem): ElementChild[] {
    if (item.action === undefined) {
        return [item.value];
    }

    const action = item.action;

    return [
        item.value,
        buildElement("button", {
            className: "icon-button detail-action",
            text: action.icon,
            attributes: {
                type: "button",
                title: action.label,
                "aria-label": action.label,
            },
            listeners: {
                click: () => action.run(),
            },
        }),
    ];
}

function changeTitle(change: ValueChange): string {
    if (change.before === null) {
        return "Added by a rule.";
    }

    return change.after === null ? `Removed by a rule. Was: ${change.before}` : `Updated by a rule. Was: ${change.before}`;
}

function modifiedTag(title: string): HTMLElement {
    return buildElement("span", {
        className: "modified-tag",
        text: ModifiedText,
        title,
    });
}

function changeOf(
    changes: ValueChange[],
    area: ChangeArea,
    name: string
): ValueChange | undefined {
    return changes.find(change => change.area === area && change.name.toLowerCase() === name.toLowerCase());
}

function removedHeaders(
    changes: ValueChange[],
    area: ChangeArea,
    headers: HeaderEntry[]
): DefinitionItem[] {
    return changes
        .filter(change => change.area === area && change.after === null)
        .filter(change => !headers.some(header => header.name.toLowerCase() === change.name.toLowerCase()))
        .map(change => ({
            term: change.name,
            value: RemovedText,
            change,
        }));
}

function flagsOf(cookie: SetCookie): string {
    return [
        cookie.secure ? "Secure" : "",
        cookie.httpOnly ? "HttpOnly" : "",
        cookie.sameSite === "" ? "" : `SameSite=${cookie.sameSite}`,
        cookie.partitioned ? "Partitioned" : "",
    ]
        .filter(flag => flag !== "")
        .join(" ");
}

function bodyContent(
    body: string,
    query: SearchQuery | null,
    wrap: boolean
): HTMLElement {
    const parsed = JsonText.tryParse(body);
    const wantsTree = CurrentInspectorPreferences.bodyMode === BodyMode.Tree && query === null;
    if (wantsTree && !parsed.hasErrors) {
        return JsonTreeView.build(parsed.value, wrap);
    }

    return buildElement("pre", {
        className: wrap ? "code-block wrap" : "code-block",
        children: TextHighlighter.build(JsonText.format(body), query),
    });
}

export const DetailSections = {
    definitions(items: DefinitionItem[]): HTMLDListElement {
        return buildElement("dl", {
            className: "definitions",
            children: items
                .filter(item => item.value !== "")
                .flatMap(item => [
                    buildElement("dt", {
                        children: [
                            item.term,
                            item.change === undefined ? null : modifiedTag(changeTitle(item.change)),
                        ],
                    }),
                    buildElement("dd", {
                        children: valueChildren(item),
                    }),
                ]),
        });
    },

    headers(
        headers: HeaderEntry[],
        changes: ValueChange[],
        area: ChangeArea,
        actionOf: HeaderActionOf = () => undefined
    ): HTMLElement {
        const items = [
            ...headers.map(header => ({
                term: header.name,
                value: header.value,
                change: changeOf(
                    changes,
                    area,
                    header.name
                ),
                action: actionOf(header),
            })),
            ...removedHeaders(
                changes,
                area,
                headers
            ),
        ];
        if (items.length === 0) {
            return buildElement("p", {
                className: "muted",
                text: "None.",
            });
        }

        return DetailSections.definitions(items);
    },

    cookies(pairs: CookiePair[]): HTMLElement | null {
        if (pairs.length === 0) {
            return null;
        }

        return buildElement("div", {
            className: "cookie-table",
            children: [
                buildElement("h4", {
                    text: `Cookies (${pairs.length})`,
                }),
                DetailSections.definitions(pairs.map(pair => ({
                    term: pair.name,
                    value: pair.value === "" ? NoneText : pair.value,
                }))),
            ],
        });
    },

    setCookies(cookies: SetCookie[]): HTMLElement | null {
        if (cookies.length === 0) {
            return null;
        }

        return buildElement("div", {
            className: "cookie-table",
            children: [
                buildElement("h4", {
                    text: `Set-Cookie (${cookies.length})`,
                }),
                ...cookies.map(cookie => buildElement("div", {
                    className: "set-cookie",
                    children: [
                        DetailSections.definitions([
                            {
                                term: "Name",
                                value: cookie.name,
                            },
                            {
                                term: "Value",
                                value: cookie.value === "" ? NoneText : cookie.value,
                            },
                            {
                                term: "Domain",
                                value: cookie.domain,
                            },
                            {
                                term: "Path",
                                value: cookie.path,
                            },
                            {
                                term: "Expires",
                                value: cookie.maxAge === "" ? UtcText.ofText(cookie.expires) : `Max-Age ${cookie.maxAge}`,
                            },
                            {
                                term: "Flags",
                                value: flagsOf(cookie),
                            },
                        ]),
                    ],
                })),
            ],
        });
    },

    body(
        body: string | null,
        note: string | null,
        query: SearchQuery | null,
        change: ValueChange | undefined = undefined
    ): HTMLElement {
        const host = buildElement("div", {
            className: "body-host",
        });
        const render = (): void => {
            if (body === null || body === "") {
                host.replaceChildren();

                return;
            }

            host.replaceChildren(bodyContent(
                body,
                query,
                CurrentInspectorPreferences.wrap
            ));
        };
        render();

        const isEmpty = body === null || body === "";

        return buildElement("div", {
            className: "body-view",
            children: [
                note === null
                    ? null
                    : buildElement("p", {
                        className: "muted",
                        text: note,
                    }),
                isEmpty && note === null
                    ? buildElement("p", {
                        className: "muted",
                        text: EmptyBodyText,
                    })
                    : null,
                isEmpty
                    ? null
                    : buildElement("div", {
                        className: "body-tools",
                        children: [
                            change === undefined ? null : modifiedTag("Changed by a rule."),
                            FormControls.select({
                                value: String(CurrentInspectorPreferences.bodyMode),
                                options: [
                                    {
                                        value: String(BodyMode.Tree),
                                        label: "Tree",
                                    },
                                    {
                                        value: String(BodyMode.Raw),
                                        label: "Raw",
                                    },
                                ],
                                onChange: value => {
                                    CurrentInspectorPreferences.bodyMode = Number(value) as BodyMode;
                                    render();
                                },
                            }),
                            FormControls.checkbox({
                                checked: CurrentInspectorPreferences.wrap,
                                label: "Wrap",
                                onChange: checked => {
                                    CurrentInspectorPreferences.wrap = checked;
                                    render();
                                },
                            }),
                        ],
                    }),
                host,
            ],
        });
    },

    changeOf,
};
