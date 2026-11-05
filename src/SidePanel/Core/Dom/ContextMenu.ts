import { buildElement } from "./ElementBuilder";

const EscapeKey = "Escape";

export interface ContextMenuItem {
    label: string;
    run: () => void;
}

export class ContextMenu {
    private _current: HTMLElement | null = null;

    constructor() {
        document.addEventListener("click", () => this.close());
        document.addEventListener("keydown", event => {
            if (event.key === EscapeKey) {
                this.close();
            }
        });
        window.addEventListener("blur", () => this.close());
    }

    open(
        items: ContextMenuItem[],
        x: number,
        y: number
    ): void {
        this.close();
        const menu = buildElement("ul", {
            className: "context-menu",
            attributes: {
                role: "menu",
            },
            children: items.map(item => buildElement("li", {
                children: [
                    buildElement("button", {
                        className: "context-menu-item",
                        text: item.label,
                        attributes: {
                            type: "button",
                            role: "menuitem",
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
        menu.style.left = `${Math.max(0, Math.min(x, window.innerWidth - bounds.width))}px`;
        menu.style.top = `${Math.max(0, Math.min(y, window.innerHeight - bounds.height))}px`;
        menu.querySelector<HTMLButtonElement>("button")?.focus();
        this._current = menu;
    }

    close(): void {
        this._current?.remove();
        this._current = null;
    }
}
