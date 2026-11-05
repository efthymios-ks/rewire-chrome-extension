import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../../Core/Dom/FormControls";

const EscapeKey = "Escape";

export interface SlidePage {
    title: string;
    content: HTMLElement;
    onClose?: () => void;
}

export class SlideOver {
    readonly root: HTMLElement;

    private readonly _pages: SlidePage[] = [];
    private readonly _title: HTMLElement;
    private readonly _body: HTMLElement;
    private readonly _backButton: HTMLButtonElement;

    constructor(label: string) {
        this._title = buildElement("h2", {
            className: "slide-title",
        });
        this._body = buildElement("div", {
            className: "slide-body",
        });
        this._backButton = FormControls.button({
            text: "Back",
            variant: ButtonVariants.Ghost,
            onClick: () => this.pop(),
        });

        this.root = buildElement("aside", {
            className: "slide-over",
            attributes: {
                role: "dialog",
                "aria-label": label,
            },
            listeners: {
                keydown: event => {
                    if (event.key !== EscapeKey) {
                        return;
                    }

                    event.stopPropagation();
                    this.pop();
                },
            },
            children: [
                buildElement("header", {
                    className: "slide-header",
                    children: [
                        this._backButton,
                        this._title,
                        FormControls.button({
                            text: "Close",
                            variant: ButtonVariants.Ghost,
                            onClick: () => this.closeAll(),
                        }),
                    ],
                }),
                this._body,
            ],
        });
        this.render();
    }

    isOpen(): boolean {
        return this._pages.length > 0;
    }

    push(page: SlidePage): void {
        this._pages.push(page);
        this.render();
    }

    replaceTop(page: SlidePage): void {
        this._pages.pop();
        this._pages.push(page);
        this.render();
    }

    pop(): void {
        const page = this._pages.pop();
        page?.onClose?.();
        this.render();
    }

    closeAll(): void {
        while (this._pages.length > 0) {
            this.pop();
        }
    }

    private render(): void {
        const page = this._pages.at(-1);
        this.root.hidden = page === undefined;
        this._backButton.hidden = this._pages.length < 2;
        this._title.textContent = page?.title ?? "";
        this._body.replaceChildren(...(page === undefined ? [] : [page.content]));
        page?.content.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    }
}
