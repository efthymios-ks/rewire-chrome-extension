import { buildElement } from './buildElement';
import type { ContextMenuItem } from './ContextMenuItem';

const ESCAPE_KEY = 'Escape';

export interface OpenOptions {
    items: ContextMenuItem[];
    clientX: number;
    clientY: number;
}

export class ContextMenu {
    private _current: HTMLElement | null = null;
    private _pageListeners: AbortController | null = null;

    open({ items, clientX, clientY }: OpenOptions): void {
        this.close();
        const menu = buildElement('ul', {
            className: 'context-menu',
            attributes: {
                role: 'menu',
            },
            children: items.map(item => buildElement('li', {
                children: [
                    buildElement('button', {
                        className: 'context-menu-item',
                        text: item.label,
                        attributes: {
                            type: 'button',
                            role: 'menuitem',
                        },
                        listeners: {
                            click: event => {
                                event.stopPropagation();
                                this.close();
                                item.run();
                            },
                        },
                    }),
                ],
            })),
        });
        document.body.append(menu);

        const bounds = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(
            /* values: */ 0,
            /* values: */ Math.min(clientX, window.innerWidth - bounds.width),
        )}px`;
        menu.style.top = `${Math.max(
            /* values: */ 0,
            /* values: */ Math.min(clientY, window.innerHeight - bounds.height),
        )}px`;
        menu.querySelector<HTMLButtonElement>('button')?.focus();
        this._current = menu;
        this.listenToThePage();
    }

    close(): void {
        this._pageListeners?.abort();
        this._pageListeners = null;
        this._current?.remove();
        this._current = null;
    }

    // Only while open, so a menu whose owner is rebuilt leaves nothing attached to the page.
    private listenToThePage(): void {
        const pageListeners = new AbortController();
        const { signal } = pageListeners;
        document.addEventListener(
            /* type: */ 'click',
            /* listener: */ () => this.close(),
            /* options: */ { signal },
        );
        document.addEventListener(
            /* type: */ 'keydown',
            /* listener: */ event => {
                if (event.key === ESCAPE_KEY) {
                    this.close();
                }
            },
            /* options: */ { signal },
        );
        window.addEventListener(
            /* type: */ 'blur',
            /* listener: */ () => this.close(),
            /* options: */ { signal },
        );
        this._pageListeners = pageListeners;
    }
}
