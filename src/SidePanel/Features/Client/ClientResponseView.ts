import { JsonText } from '../../../Common/Json/JsonText';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import { buildElement } from '../../Core/Dom/buildElement';
import { DurationText } from '../../Core/Formatting/DurationText';
import { StatusAppearance } from '../../Core/Formatting/StatusAppearance';

const TABS = Object.freeze({
    Body: 'body',
    Headers: 'headers',
} as const);

type TabKey = typeof TABS[keyof typeof TABS];

function bodyPane(response: ClientExchangeResponse): HTMLElement {
    if (response.body === '') {
        return buildElement('p', {
            className: 'empty-note',
            text: 'Empty body.',
        });
    }

    return buildElement('pre', {
        className: 'code-block',
        attributes: { 'data-wrap': '' },
        text: JsonText.format(response.body),
    });
}

function headersPane(response: ClientExchangeResponse): HTMLElement {
    if (response.headers.length === 0) {
        return buildElement('p', {
            className: 'empty-note',
            text: 'No response headers.',
        });
    }

    return buildElement('dl', {
        className: 'definitions',
        children: response.headers.flatMap(header => [
            buildElement('dt', {
                text: header.name,
            }),
            buildElement('dd', {
                text: header.value,
            }),
        ]),
    });
}

export class ClientResponseView {
    readonly root: HTMLElement;

    private readonly _header: HTMLElement;
    private readonly _body: HTMLElement;
    private readonly _tabButtons = new Map<TabKey, HTMLButtonElement>();
    private _activeTab: TabKey = TABS.Body;
    private _response: ClientExchangeResponse | null = null;
    private _error: string | null = null;
    private _isBusy = false;

    constructor() {
        this._header = buildElement('div', {
            className: 'client-response-header',
        });
        this._body = buildElement('div', {
            className: 'client-response-body',
        });
        const tabBar = buildElement('nav', {
            className: 'inspector-tabs',
            attributes: {
                role: 'tablist',
            },
        });
        (Object.entries(TABS) as Array<[string, TabKey]>).forEach(([label, key]) => {
            const button = buildElement('button', {
                className: 'tab',
                text: label,
                attributes: {
                    type: 'button',
                    role: 'tab',
                },
                listeners: {
                    click: () => {
                        this._activeTab = key;
                        this.render();
                    },
                },
            });
            this._tabButtons.set(key, button);
            tabBar.append(button);
        });

        this.root = buildElement('section', {
            className: 'client-response',
            attributes: {
                'aria-label': 'Response',
            },
            children: [
                this._header,
                tabBar,
                this._body,
            ],
        });
        this.render();
    }

    showPending(): void {
        this._isBusy = true;
        this._error = null;
        this._response = null;
        this.render();
    }

    showError(error: string): void {
        this._isBusy = false;
        this._error = error;
        this._response = null;
        this.render();
    }

    showResponse(response: ClientExchangeResponse): void {
        this._isBusy = false;
        this._error = null;
        this._response = response;
        this.render();
    }

    private render(): void {
        this.renderHeader();
        this.renderTabs();
        this.renderBody();
    }

    private renderHeader(): void {
        if (this._isBusy) {
            this._header.replaceChildren(buildElement('span', {
                className: 'client-response-note',
                text: 'Sending...',
            }));

            return;
        }

        if (this._error != null) {
            this._header.replaceChildren(buildElement('span', {
                className: 'form-error',
                text: this._error,
            }));

            return;
        }

        if (this._response == null) {
            this._header.replaceChildren(buildElement('span', {
                className: 'client-response-note',
                text: 'Send a request to see the response.',
            }));

            return;
        }

        const response = this._response;
        this._header.replaceChildren(
            /* nodes: */ buildElement('span', {
                className: `status ${StatusAppearance.classOfCode(response.status)}`,
                text: StatusAppearance.lineOf(response.status, response.statusText),
            }),
            /* nodes: */ buildElement('span', {
                className: 'client-response-duration',
                text: DurationText.of(response.durationInMilliseconds),
            }),
        );
    }

    private renderTabs(): void {
        const isEnabled = this._response != null;
        this._tabButtons.forEach((button, key) => {
            button.disabled = !isEnabled;
            button.setAttribute(
                /* qualifiedName: */ 'aria-selected',
                /* value: */ String(isEnabled && this._activeTab === key),
            );
        });
    }

    private renderBody(): void {
        if (this._response == null) {
            this._body.replaceChildren();

            return;
        }

        const pane = this._activeTab === TABS.Headers
            ? headersPane(this._response)
            : bodyPane(this._response);
        this._body.replaceChildren(pane);
    }
}
