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
const ChangedClass = "changed";

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
    return change.before === null ? "Added by a rule." : `Updated by a rule. Was: ${change.before}`;
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
            value: `Removed (was ${change.before ?? NoneText})`,
            change,
        }));
}

function table(columns: string[], rows: string[][]): HTMLElement {
    return buildElement("table", {
        className: "grid",
        children: [
            buildElement("thead", {
                children: [
                    buildElement("tr", {
                        children: columns.map(column => buildElement("th", {
                            text: column,
                        })),
                    }),
                ],
            }),
            buildElement("tbody", {
                children: rows.map(row => buildElement("tr", {
                    children: row.map(cell => buildElement("td", {
                        className: "cell-truncate",
                        text: cell,
                        title: cell,
                    })),
                })),
            }),
        ],
    });
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
    section(
        id: string,
        title: string,
        content: ElementChild[]
    ): HTMLDetailsElement {
        const details = buildElement("details", {
            className: "detail-section",
            children: [
                buildElement("summary", {
                    text: title,
                }),
                ...content,
            ],
        });
        details.dataset["section"] = id;

        return details;
    },

    definitions(items: DefinitionItem[]): HTMLDListElement {
        return buildElement("dl", {
            className: "definitions",
            children: items
                .filter(item => item.value !== "")
                .flatMap(item => {
                    const className = item.change === undefined ? "" : ChangedClass;
                    const title = item.change === undefined ? "" : changeTitle(item.change);

                    return [
                        buildElement("dt", {
                            className,
                            text: item.term,
                            title,
                        }),
                        buildElement("dd", {
                            className,
                            children: valueChildren(item),
                            title,
                        }),
                    ];
                }),
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
                table(
                    [
                        "Name",
                        "Value",
                    ],
                    pairs.map(pair => [
                        pair.name,
                        pair.value,
                    ])
                ),
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
                table(
                    [
                        "Name",
                        "Value",
                        "Domain",
                        "Path",
                        "Expires",
                        "Flags",
                    ],
                    cookies.map(cookie => [
                        cookie.name,
                        cookie.value,
                        cookie.domain,
                        cookie.path,
                        cookie.maxAge === "" ? UtcText.ofText(cookie.expires) : `Max-Age ${cookie.maxAge}`,
                        flagsOf(cookie),
                    ])
                ),
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

        return buildElement("div", {
            className: change === undefined ? "body-view" : "body-view changed",
            title: change === undefined ? "" : "Updated by a rule.",
            children: [
                note === null
                    ? null
                    : buildElement("p", {
                        className: "muted",
                        text: note,
                    }),
                body === null || body === ""
                    ? null
                    : buildElement("div", {
                        className: "body-tools",
                        children: [
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
