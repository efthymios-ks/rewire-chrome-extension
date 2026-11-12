import { DomainMatcher } from "../../../Common/Urls/DomainMatcher";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import { ConfirmDialog } from "../../Core/Dom/ConfirmDialog";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { EmptyState } from "../../Core/Dom/EmptyState";
import { UtcText } from "../../Core/Formatting/UtcText";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { ViewId } from "../../Core/ViewId";
import { RuleFactory } from "../Rules/RuleFactory";
import type { PanelContext } from "../Shell/PanelContext";
import type { CookieDraft } from "./CookieDraft";
import { CookieDrafts } from "./CookieDrafts";
import { CookieFilter } from "./CookieFilter";
import { CookieForm } from "./CookieForm";

const SupportedProtocols = [
    "http:",
    "https:",
];
const SecureProtocol = "https:";
const MillisecondsPerSecond = 1000;
const RefreshDelayInMilliseconds = 300;
const SessionText = "Session";
const LeadingDotPattern = /^\./;
const SearchLabel = "Search cookie names and values";
const SearchPlaceholder = "Search name or value";

const CookieGroupName = "cookie";
const YesText = "Yes";
const NoText = "No";

const SameSiteTexts: Record<string, string> = {
    unspecified: "Not set (Lax)",
    lax: "Lax",
    strict: "Strict",
    no_restriction: "None",
};
const KeySeparator = "|";

interface CookieColumn {
    title: string;
    className: string;
    valueOf(cookie: chrome.cookies.Cookie): string;
}

const CookieColumns: CookieColumn[] = [
    {
        title: "Name",
        className: "code-text",
        valueOf: cookie => cookie.name,
    },
    {
        title: "Domain",
        className: "",
        valueOf: cookie => cookie.domain,
    },
    {
        title: "Path",
        className: "",
        valueOf: cookie => cookie.path,
    },
    {
        title: "Expires",
        className: "",
        valueOf: cookie => expiresOf(cookie),
    },
    {
        title: "HttpOnly",
        className: "",
        valueOf: cookie => yesOrNo(cookie.httpOnly),
    },
    {
        title: "Secure",
        className: "",
        valueOf: cookie => yesOrNo(cookie.secure),
    },
    {
        title: "SameSite",
        className: "",
        valueOf: cookie => SameSiteTexts[cookie.sameSite] ?? cookie.sameSite,
    },
];

function keyOf(cookie: chrome.cookies.Cookie): string {
    return [
        cookie.name,
        cookie.domain,
        cookie.path,
    ].join(KeySeparator);
}

function yesOrNo(value: boolean): string {
    return value ? YesText : NoText;
}

function expiresOf(cookie: chrome.cookies.Cookie): string {
    if (cookie.expirationDate === undefined) {
        return SessionText;
    }

    return UtcText.of(new Date(cookie.expirationDate * MillisecondsPerSecond));
}

export class CookiesView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _formHost: HTMLElement;
    private readonly _content: HTMLElement;
    private readonly _pageLabel: HTMLElement;
    private _pageUrl: URL | null = null;
    private _cookies: chrome.cookies.Cookie[] = [];
    private _searchText = "";
    private _isActive = false;
    private _refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private _openCookieKey: string | null = null;

    constructor(context: PanelContext) {
        this._context = context;
        this._formHost = buildElement("div", {
            className: "form-host",
        });
        this._content = buildElement("div", {
            className: "cookie-content",
        });
        this._pageLabel = buildElement("span", {
            className: "muted code-text",
        });
        const search = FormControls.textInput({
            value: "",
            placeholder: SearchPlaceholder,
            className: "input cookie-search",
            onInput: text => {
                this._searchText = text;
                this.render();
            },
        });
        search.setAttribute("aria-label", SearchLabel);
        this.root = buildElement("section", {
            className: "settings-view",
            children: [
                buildElement("div", {
                    className: "view-header",
                    children: [
                        buildElement("div", {
                            className: "view-title",
                            children: [
                                buildElement("h2", {
                                    text: "Cookie Jar",
                                }),
                                this._pageLabel,
                            ],
                        }),
                        FormControls.button({
                            text: "Refresh",
                            variant: ButtonVariants.Ghost,
                            onClick: () => void this.refresh(),
                        }),
                        FormControls.button({
                            text: "Add cookie",
                            variant: ButtonVariants.Primary,
                            onClick: () => this.openBlank(),
                        }),
                    ],
                }),
                search,
                this._formHost,
                this._content,
            ],
        });

        context.cookieClient.subscribe(cookie => {
            const isPageCookie = this._pageUrl !== null
                && DomainMatcher.matches(this._pageUrl.hostname, cookie.domain.replace(LeadingDotPattern, ""));
            if (this._isActive && isPageCookie) {
                this.scheduleRefresh();
            }
        });

        context.store.select(
            state => state.inspectedTab?.url ?? "",
            url => {
                const parsed = SafeUrl.parse(url);
                this._pageUrl = parsed !== null && SupportedProtocols.includes(parsed.protocol) ? parsed : null;
                this._pageLabel.textContent = this._pageUrl?.origin ?? "";
                this._formHost.replaceChildren();
                this.refreshWhenActive();
            }
        );

        context.store.select(
            state => state.activeView === ViewId.CookieJar,
            isActive => {
                this._isActive = isActive;
                this.refreshWhenActive();
            }
        );
    }

    private refreshWhenActive(): void {
        if (!this._isActive) {
            return;
        }

        void this.refresh();
    }

    private scheduleRefresh(): void {
        if (this._refreshTimer !== null) {
            clearTimeout(this._refreshTimer);
        }

        this._refreshTimer = setTimeout(
            () => void this.refresh(),
            RefreshDelayInMilliseconds
        );
    }

    private async refresh(): Promise<void> {
        const pageUrl = this._pageUrl;
        if (pageUrl === null) {
            this._content.replaceChildren(EmptyState.build("Open an http or https page to see its cookies."));

            return;
        }

        const cookies = await this._context.cookieClient.list(pageUrl.href);
        if (cookies.hasErrors) {
            this._content.replaceChildren(EmptyState.build(cookies.error));

            return;
        }

        this._cookies = cookies.value;
        this.render();
    }

    private render(): void {
        if (this._cookies.length === 0) {
            this._content.replaceChildren(EmptyState.build("This page has no cookies."));

            return;
        }

        const visible = CookieFilter.apply(this._cookies, this._searchText);
        if (visible.length === 0) {
            this._content.replaceChildren(EmptyState.build(`No cookie name or value contains "${this._searchText.trim()}".`));

            return;
        }

        this._content.replaceChildren(buildElement("div", {
            className: "cookie-list",
            children: [
                buildElement("div", {
                    className: "cookie-columns cookie-header",
                    attributes: {
                        "aria-hidden": "true",
                    },
                    children: CookieColumns.map(column => buildElement("span", {
                        text: column.title,
                    })),
                }),
                ...visible.map(cookie => this.itemFor(cookie)),
            ],
        }));
    }

    private itemFor(cookie: chrome.cookies.Cookie): HTMLDetailsElement {
        const key = keyOf(cookie);
        const item = buildElement("details", {
            className: "cookie-item",
            attributes: {
                name: CookieGroupName,
            },
            children: [
                buildElement("summary", {
                    className: "cookie-columns",
                    children: CookieColumns.map(column => buildElement("span", {
                        className: "cookie-field",
                        children: [
                            buildElement("span", {
                                className: "cookie-label",
                                text: column.title,
                            }),
                            buildElement("span", {
                                className: column.className,
                                text: column.valueOf(cookie),
                            }),
                        ],
                    })),
                }),
                buildElement("div", {
                    className: "cookie-detail",
                    children: [
                        buildElement("span", {
                            className: "field-label",
                            text: "Value",
                        }),
                        buildElement("pre", {
                            className: "code-block wrap",
                            text: cookie.value,
                        }),
                        buildElement("div", {
                            className: "row-actions",
                            children: [
                                FormControls.button({
                                    text: "Edit",
                                    variant: ButtonVariants.Ghost,
                                    onClick: () => this.openForm(CookieDrafts.fromCookie(cookie), false),
                                }),
                                FormControls.button({
                                    text: "Make rule",
                                    variant: ButtonVariants.Ghost,
                                    title: "Open a Request cookie rule that sends this cookie on every request to its domain",
                                    onClick: () => this._context.ruleEditor.open(RuleFactory.cookieOf(cookie), true),
                                }),
                                FormControls.button({
                                    text: "Remove",
                                    variant: ButtonVariants.Danger,
                                    onClick: () => void this.remove(cookie),
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });
        item.open = this._openCookieKey === key;
        item.addEventListener("toggle", () => {
            if (item.open) {
                this._openCookieKey = key;

                return;
            }

            if (this._openCookieKey === key) {
                this._openCookieKey = null;
            }
        });

        return item;
    }

    private openBlank(): void {
        if (this._pageUrl === null) {
            this._context.notifier.show("Open an http or https page first.");

            return;
        }

        this.openForm(CookieDrafts.blank(this._pageUrl.hostname, this._pageUrl.protocol === SecureProtocol), true);
    }

    private openForm(draft: CookieDraft, isUnsaved: boolean): void {
        const close = (): void => this._formHost.replaceChildren();
        const form: CookieForm = new CookieForm({
            draft,
            isUnsaved,
            onSave: async saved => {
                const result = await this._context.cookieClient.save(saved);
                if (result.hasErrors) {
                    form.showError(result.error);

                    return;
                }

                close();
                await this.refresh();
            },
            onCancel: close,
        });
        this._formHost.replaceChildren(form.root);
    }

    private async remove(cookie: chrome.cookies.Cookie): Promise<void> {
        const confirmed = await ConfirmDialog.ask({
            title: "Remove cookie",
            message: `Remove the cookie "${cookie.name}" from ${cookie.domain}?`,
            confirmText: "Remove",
        });
        if (!confirmed) {
            return;
        }

        const removed = await this._context.cookieClient.remove(cookie);
        if (removed.hasErrors) {
            this._context.notifier.show(removed.error);

            return;
        }

        await this.refresh();
    }
}
