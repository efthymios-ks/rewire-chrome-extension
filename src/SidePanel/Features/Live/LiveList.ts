import { JwtFinder } from '../../../Common/Jwt/JwtFinder';
import { copyWithNoticeAsync } from '../../Core/copyWithNoticeAsync';
import { buildElement, type ElementChild } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import { ClockText } from '../../Core/Formatting/ClockText';
import { JsonTreeView } from '../Inspector/JsonTreeView';
import type { PanelContext } from '../Shell/PanelContext';
import { LivePayload } from './LivePayload';

export interface LiveListAction {
    label: string;
    run: () => void;
}

export interface LiveListItem {
    id: string;
    title: ElementChild[];
    at: string;
    data: string | null;
    hasDataLine: boolean;
    isMuted: boolean;
    facts: string[];
    actions: LiveListAction[];
}

const FACT_SEPARATOR = ' · ';

const ROW_SELECTOR = ':scope > .live-item';
const ROW_ID_ATTRIBUTE = 'data-id';

interface RenderedRow {
    element: HTMLElement;
    isExpanded: boolean;
}

interface ScrollAnchor {
    id: string;
    offset: number;
}

function stateAttributesOf(item: LiveListItem, isExpanded: boolean): Record<string, string> {
    return {
        ...(item.isMuted ? { 'data-muted': '' } : {}),
        ...(isExpanded ? { 'data-expanded': '' } : {}),
    };
}

function payloadOf(data: string): HTMLElement | null {
    if (data === '') {
        return null;
    }

    const json = LivePayload.jsonOf(data);

    return json === undefined
        ? buildElement('pre', {
            className: 'code-block live-raw',
            text: data,
        })
        : JsonTreeView.build(json, true);
}

export class LiveList {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _emptyText: string;
    private readonly _rows = new Map<string, RenderedRow>();
    private _items: LiveListItem[] = [];
    private _expandedId: string | null = null;

    constructor(context: PanelContext, emptyText: string) {
        this._context = context;
        this._emptyText = emptyText;
        this.root = buildElement('ul', {
            className: 'live-list',
        });
    }

    update(items: LiveListItem[]): void {
        this._items = items;
        this.render();
    }

    private render(): void {
        if (this._items.length === 0) {
            this._rows.clear();
            this.root.replaceChildren(buildElement('li', {
                className: 'live-empty',
                text: this._emptyText,
            }));

            return;
        }

        const anchor = this.anchorOf();
        const ids = new Set(this._items.map(item => item.id));
        [...this._rows.keys()]
            .filter(id => !ids.has(id))
            .forEach(id => this._rows.delete(id));
        this.root.replaceChildren(...this._items
            .toReversed()
            .map(item => this.rowFor(item)));
        this.restore(anchor);
    }

    private anchorOf(): ScrollAnchor | null {
        const scrollTop = this.root.scrollTop;
        const row = [...this.root.querySelectorAll<HTMLElement>(ROW_SELECTOR)]
            .find(element => element.offsetTop + element.offsetHeight > scrollTop);
        const id = row?.getAttribute(ROW_ID_ATTRIBUTE);
        if (row == null || id == null) {
            return null;
        }

        return {
            id,
            offset: row.offsetTop - scrollTop,
        };
    }

    private restore(anchor: ScrollAnchor | null): void {
        if (anchor == null) {
            return;
        }

        const row = this._rows.get(anchor.id);
        if (row == null) {
            return;
        }

        this.root.scrollTop = row.element.offsetTop - anchor.offset;
    }

    private rowFor(item: LiveListItem): HTMLElement {
        const isExpanded = item.id === this._expandedId;
        const existing = this._rows.get(item.id);
        if (existing != null && existing.isExpanded === isExpanded) {
            return existing.element;
        }

        const element = this.rowOf(item, isExpanded);
        this._rows.set(
            /* key: */ item.id,
            /* value: */ {
                element,
                isExpanded,
            },
        );

        return element;
    }

    private rowOf(item: LiveListItem, isExpanded: boolean): HTMLElement {
        return buildElement('li', {
            className: 'live-item',
            attributes: {
                [ROW_ID_ATTRIBUTE]: item.id,
                ...stateAttributesOf(item, isExpanded),
            },
            children: [
                buildElement('button', {
                    className: 'live-item-head',
                    attributes: {
                        type: 'button',
                        'aria-expanded': String(isExpanded),
                    },
                    children: [
                        buildElement('span', {
                            className: 'live-item-title',
                            children: item.title,
                        }),
                        buildElement('span', {
                            className: 'live-item-time',
                            text: ClockText.of(item.at),
                        }),
                    ],
                    listeners: {
                        click: () => this.toggle(item.id),
                    },
                }),
                !item.hasDataLine || item.data == null || item.data === ''
                    ? null
                    : buildElement('div', {
                        className: 'live-item-preview',
                        text: item.data,
                    }),
                isExpanded ? this.detailsOf(item) : null,
            ],
        });
    }

    private detailsOf(item: LiveListItem): HTMLElement {
        const data = item.data ?? '';
        const token = JwtFinder.find(data);

        return buildElement('div', {
            className: 'live-item-details',
            children: [
                buildElement('p', {
                    className: 'live-facts',
                    text: item.facts.join(FACT_SEPARATOR),
                }),
                buildElement('div', {
                    className: 'actions',
                    children: [
                        FormControls.button({
                            text: 'Copy',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => void copyWithNoticeAsync({
                                context: this._context,
                                text: data,
                                successMessage: 'Payload copied.',
                            }),
                        }),
                        token == null
                            ? null
                            : FormControls.button({
                                text: 'Open JWT',
                                variant: BUTTON_VARIANTS.Ghost,
                                onClick: () => this._context.viewLauncher.openJwt(token),
                            }),
                        ...item.actions.map(action => FormControls.button({
                            text: action.label,
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: action.run,
                        })),
                    ],
                }),
                payloadOf(data),
            ],
        });
    }

    private toggle(itemId: string): void {
        this._expandedId = this._expandedId === itemId ? null : itemId;
        this.render();
    }
}
