import { SAME_SITE_LABELS } from '../../../Common/Http/SameSiteLabels';
import type { Result } from '../../../Common/Results/Result';
import { DomainMatcher } from '../../../Common/Urls/DomainMatcher';
import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { ConfirmDialog } from '../../Core/Dom/ConfirmDialog';
import { EmptyState } from '../../Core/Dom/EmptyState';
import { UtcText } from '../../Core/Formatting/UtcText';
import { FormControls } from '../../Core/Dom/FormControls';
import { VIEW_ID } from '../../Core/ViewId';
import { RuleFactory } from '../Rules/RuleFactory';
import type { PanelContext } from '../Shell/PanelContext';
import type { CookieDraft } from './CookieDraft';
import { CookieDrafts } from './CookieDrafts';
import { CookieFilter } from './CookieFilter';
import { CookieForm } from './CookieForm';
import { CookieKeys } from './CookieKeys';

const SUPPORTED_PROTOCOLS = [
    'http:',
    'https:',
];
const SECURE_PROTOCOL = 'https:';
const MILLISECONDS_PER_SECOND = 1000;
const REFRESH_DELAY_IN_MILLISECONDS = 300;
const NO_PAGE_TEXT = 'Open an http or https page to see its cookies.';
const SESSION_TEXT = 'Session';
const LEADING_DOT_PATTERN = /^\./;
const SEARCH_LABEL = 'Search cookie names and values';
const SEARCH_PLACEHOLDER = 'Search name or value';

const COOKIE_GROUP_NAME = 'cookie';
const YES_TEXT = 'Yes';
const NO_TEXT = 'No';

interface CookieColumn {
    title: string;
    className: string;
    valueOf(cookie: chrome.cookies.Cookie): string;
}

const COOKIE_COLUMNS: CookieColumn[] = [
    {
        title: 'Name',
        className: 'cookie-name',
        valueOf: cookie => cookie.name,
    },
    {
        title: 'Domain',
        className: '',
        valueOf: cookie => cookie.domain,
    },
    {
        title: 'Path',
        className: '',
        valueOf: cookie => cookie.path,
    },
    {
        title: 'Expires',
        className: '',
        valueOf: cookie => expiresOf(cookie),
    },
    {
        title: 'HttpOnly',
        className: '',
        valueOf: cookie => yesOrNo(cookie.httpOnly),
    },
    {
        title: 'Secure',
        className: '',
        valueOf: cookie => yesOrNo(cookie.secure),
    },
    {
        title: 'SameSite',
        className: '',
        valueOf: cookie => SAME_SITE_LABELS[cookie.sameSite] ?? cookie.sameSite,
    },
    {
        title: 'Partitioned',
        className: '',
        valueOf: cookie => yesOrNo(cookie.partitionKey != null),
    },
];

function yesOrNo(isYes: boolean): string {
    return isYes ? YES_TEXT : NO_TEXT;
}

function expiresOf(cookie: chrome.cookies.Cookie): string {
    if (cookie.expirationDate == null) {
        return SESSION_TEXT;
    }

    return UtcText.of(new Date(cookie.expirationDate * MILLISECONDS_PER_SECOND));
}

export class CookiesView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _formHost: HTMLElement;
    private readonly _content: HTMLElement;
    private readonly _pageLabel: HTMLElement;
    private _pageUrl: URL | null = null;
    private _cookies: chrome.cookies.Cookie[] = [];
    private _searchText = '';
    private _isActive = false;
    private _refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private _openCookieKey: string | null = null;

    constructor(context: PanelContext) {
        this._context = context;
        this._formHost = buildElement('div', {
            className: 'form-host',
        });
        this._content = buildElement('div', {
            className: 'cookie-content',
        });
        this._pageLabel = buildElement('span', {
            className: 'cookie-page',
        });
        const search = FormControls.textInput({
            value: '',
            placeholder: SEARCH_PLACEHOLDER,
            className: 'input cookie-search',
            onInput: text => {
                this._searchText = text;
                this.render();
            },
        });
        search.setAttribute('aria-label', SEARCH_LABEL);
        this.root = buildElement('section', {
            className: 'settings-view',
            children: [
                buildElement('div', {
                    className: 'view-header',
                    children: [
                        buildElement('div', {
                            className: 'view-title',
                            children: [
                                buildElement('h2', {
                                    text: 'Cookie Jar',
                                }),
                                this._pageLabel,
                            ],
                        }),
                        FormControls.button({
                            text: 'Refresh',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => void this.refreshAsync(),
                        }),
                        FormControls.button({
                            text: 'Add cookie',
                            variant: BUTTON_VARIANTS.Primary,
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
            const isPageCookie = this._pageUrl != null
                && DomainMatcher.matches(
                    /* host: */ this._pageUrl.hostname,
                    /* domain: */ cookie.domain.replace(LEADING_DOT_PATTERN, ''),
                );
            if (this._isActive && isPageCookie) {
                this.scheduleRefresh();
            }
        });

        context.store.select({
            selector: state => state.inspectedTab?.url ?? '',
            listener: url => {
                const parsed = SafeUrl.parse(url);
                this._pageUrl = parsed != null && SUPPORTED_PROTOCOLS.includes(parsed.protocol)
                    ? parsed
                    : null;
                this._pageLabel.textContent = this._pageUrl?.origin ?? '';
                this._formHost.replaceChildren();
                this.refreshWhenActive();
            },
        });

        context.store.select({
            selector: state => state.activeView === VIEW_ID.CookieJar,
            listener: isActive => {
                this._isActive = isActive;
                this.refreshWhenActive();
            },
        });
    }

    private refreshWhenActive(): void {
        if (!this._isActive) {
            return;
        }

        void this.refreshAsync();
    }

    private scheduleRefresh(): void {
        if (this._refreshTimer != null) {
            clearTimeout(this._refreshTimer);
        }

        this._refreshTimer = setTimeout(
            /* callback: */ () => void this.refreshAsync(),
            /* delay: */ REFRESH_DELAY_IN_MILLISECONDS,
        );
    }

    private async refreshAsync(): Promise<void> {
        const pageUrl = this._pageUrl;
        const tab = this._context.store.getState().inspectedTab;
        if (pageUrl == null || tab == null) {
            this._cookies = [];
            this.render();

            return;
        }

        const cookies = await this._context.cookieClient.listAsync({
            url: pageUrl.href,
            tabId: tab.tabId,
        });
        if (this._pageUrl !== pageUrl) {
            return;
        }

        if (cookies.hasErrors) {
            this._cookies = [];
            this._content.replaceChildren(EmptyState.build(cookies.error));

            return;
        }

        this._cookies = cookies.value;
        this.render();
    }

    private render(): void {
        if (this._pageUrl == null) {
            this._content.replaceChildren(EmptyState.build(NO_PAGE_TEXT));

            return;
        }

        if (this._cookies.length === 0) {
            this._content.replaceChildren(EmptyState.build('This page has no cookies.'));

            return;
        }

        const visible = CookieFilter.apply(this._cookies, this._searchText);
        if (visible.length === 0) {
            const message = `No cookie name or value contains "${this._searchText.trim()}".`;
            this._content.replaceChildren(EmptyState.build(message));

            return;
        }

        this._content.replaceChildren(buildElement('div', {
            className: 'cookie-list',
            children: [
                buildElement('div', {
                    className: 'cookie-columns cookie-columns-header',
                    attributes: {
                        'aria-hidden': 'true',
                    },
                    children: COOKIE_COLUMNS.map(column => buildElement('span', {
                        text: column.title,
                    })),
                }),
                ...visible.map(cookie => this.itemFor(cookie)),
            ],
        }));
    }

    private itemFor(cookie: chrome.cookies.Cookie): HTMLDetailsElement {
        const key = CookieKeys.of(cookie);
        const item = buildElement('details', {
            className: 'cookie-item',
            attributes: {
                name: COOKIE_GROUP_NAME,
            },
            children: [
                buildElement('summary', {
                    className: 'cookie-columns',
                    children: COOKIE_COLUMNS.map(column => buildElement('span', {
                        className: 'cookie-field',
                        children: [
                            buildElement('span', {
                                className: 'cookie-label',
                                text: column.title,
                            }),
                            buildElement('span', {
                                className: column.className,
                                text: column.valueOf(cookie),
                            }),
                        ],
                    })),
                }),
                buildElement('div', {
                    className: 'cookie-detail',
                    children: [
                        buildElement('span', {
                            className: 'field-label',
                            text: 'Value',
                        }),
                        buildElement('pre', {
                            className: 'code-block',
                            attributes: { 'data-wrap': '' },
                            text: cookie.value,
                        }),
                        buildElement('div', {
                            className: 'row-actions',
                            children: [
                                FormControls.button({
                                    text: 'Edit',
                                    variant: BUTTON_VARIANTS.Ghost,
                                    onClick: () => this.openForm(
                                        /* draft: */ CookieDrafts.fromCookie(cookie),
                                        /* original: */ cookie,
                                    ),
                                }),
                                FormControls.button({
                                    text: 'Make rule',
                                    variant: BUTTON_VARIANTS.Ghost,
                                    title: 'Open a Request cookie rule that sends this cookie on every request to its domain',
                                    onClick: () => this._context.ruleEditor.open(
                                        /* rule: */ RuleFactory.cookieOf(cookie),
                                        /* isNew: */ true,
                                    ),
                                }),
                                FormControls.button({
                                    text: 'Remove',
                                    variant: BUTTON_VARIANTS.Danger,
                                    onClick: () => void this.removeAsync(cookie),
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });
        item.open = this._openCookieKey === key;
        item.addEventListener(
            /* type: */ 'toggle',
            /* listener: */ () => {
                if (item.open) {
                    this._openCookieKey = key;

                    return;
                }

                if (this._openCookieKey === key) {
                    this._openCookieKey = null;
                }
            },
        );

        return item;
    }

    private openBlank(): void {
        if (this._pageUrl == null) {
            this._context.notifier.show('Open an http or https page first.');

            return;
        }

        this.openForm(
            /* draft: */ CookieDrafts.blank(
                /* host: */ this._pageUrl.hostname,
                /* isSecure: */ this._pageUrl.protocol === SECURE_PROTOCOL,
            ),
            /* original: */ null,
        );
    }

    private openForm(draft: CookieDraft, original: chrome.cookies.Cookie | null): void {
        const close = (): void => this._formHost.replaceChildren();
        const form: CookieForm = new CookieForm({
            draft,
            isNew: original == null,
            onSave: async saved => {
                const result = await this.saveAsync(saved, original);
                if (result.hasErrors) {
                    form.showError(result.error);

                    return;
                }

                close();
                await this.refreshAsync();
            },
            onCancel: close,
        });
        this._formHost.replaceChildren(form.root);
    }

    // Chrome keys a cookie by name, domain, path and partition, so editing any of those adds a second cookie.
    private async saveAsync(
        draft: CookieDraft,
        original: chrome.cookies.Cookie | null,
    ): Promise<Result<void>> {
        const { cookieClient } = this._context;
        const saved = await cookieClient.saveAsync(draft);
        if (
            saved.hasErrors
            || original == null
            || CookieDrafts.isSameCookie(draft, original)
        ) {
            return saved;
        }

        const removed = await cookieClient.removeAsync(original);
        if (removed.hasErrors) {
            return removed;
        }

        // Removing by URL also drops a same-named cookie that URL would send, which can be the new one.
        return cookieClient.saveAsync(draft);
    }

    private async removeAsync(cookie: chrome.cookies.Cookie): Promise<void> {
        const confirmed = await ConfirmDialog.askAsync({
            title: 'Remove cookie',
            message: `Remove the cookie "${cookie.name}" from ${cookie.domain}?`,
            confirmText: 'Remove',
        });
        if (!confirmed) {
            return;
        }

        const removed = await this._context.cookieClient.removeAsync(cookie);
        if (removed.hasErrors) {
            this._context.notifier.show(removed.error);

            return;
        }

        await this.refreshAsync();
    }
}
