import { buildElement } from "./ElementBuilder";
import { FormControls } from "./FormControls";

export type SuggestionSource = readonly string[] | (() => readonly string[]);

export interface SuggestionInputArguments {
    value: string;
    placeholder: string;
    suggestions: SuggestionSource;
    onInput: (value: string) => void;
    className?: string;
    wrapperClassName?: string;
    label?: string;
}

const DefaultInputClass = "input";
const WrapperClass = "suggestion-input";
const MaxShown = 8;
const NoActive = -1;

const Keys = {
    Down: "ArrowDown",
    Up: "ArrowUp",
    Enter: "Enter",
    Tab: "Tab",
    Escape: "Escape",
} as const;

let nextListId = 1;

function sourceValues(source: SuggestionSource): readonly string[] {
    return typeof source === "function" ? source() : source;
}

export const SuggestionMatches = {
    of(source: readonly string[], text: string): string[] {
        const needle = text.trim().toLowerCase();
        const starts = source.filter(value => value.toLowerCase().startsWith(needle));
        const contains = source.filter(value => !value.toLowerCase().startsWith(needle) && value.toLowerCase().includes(needle));
        const matches = [
            ...starts,
            ...contains,
        ];
        const isOnlyExact = matches.length === 1 && matches[0]!.toLowerCase() === needle;

        return isOnlyExact ? [] : matches.slice(0, MaxShown);
    },
};

class SuggestionPopup {
    readonly input: HTMLInputElement;
    readonly list: HTMLUListElement;

    private readonly _args: SuggestionInputArguments;
    private _matches: string[] = [];
    private _active = NoActive;

    constructor(args: SuggestionInputArguments) {
        this._args = args;
        const listId = `suggestions-${nextListId++}`;
        this.input = FormControls.textInput({
            value: args.value,
            placeholder: args.placeholder,
            className: args.className ?? DefaultInputClass,
            onInput: value => {
                args.onInput(value);
                this.open();
            },
        });
        this.input.autocomplete = "off";
        this.input.spellcheck = false;
        this.input.setAttribute("role", "combobox");
        this.input.setAttribute("aria-autocomplete", "list");
        this.input.setAttribute("aria-expanded", "false");
        this.input.setAttribute("aria-controls", listId);
        if (args.label !== undefined) {
            this.input.setAttribute("aria-label", args.label);
        }

        this.list = buildElement("ul", {
            className: "suggestion-list",
            attributes: {
                id: listId,
                role: "listbox",
            },
        });
        this.list.hidden = true;

        this.input.addEventListener("focus", () => this.open());
        this.input.addEventListener("blur", () => this.close());
        this.input.addEventListener("keydown", event => this.onKey(event));
        window.addEventListener(
            "scroll",
            () => this.close(),
            true
        );
        window.addEventListener("resize", () => this.close());
    }

    private open(): void {
        this._matches = SuggestionMatches.of(sourceValues(this._args.suggestions), this.input.value);
        this._active = NoActive;
        if (this._matches.length === 0) {
            this.close();

            return;
        }

        this.render();
        const bounds = this.input.getBoundingClientRect();
        this.list.style.left = `${bounds.left}px`;
        this.list.style.top = `${bounds.bottom}px`;
        this.list.style.minWidth = `${bounds.width}px`;
        this.list.hidden = false;
        this.input.setAttribute("aria-expanded", "true");
    }

    private close(): void {
        this.list.hidden = true;
        this._active = NoActive;
        this.input.setAttribute("aria-expanded", "false");
        this.input.removeAttribute("aria-activedescendant");
    }

    private pick(value: string): void {
        this.input.value = value;
        this._args.onInput(value);
        this.close();
    }

    private move(step: number): void {
        if (this.list.hidden) {
            this.open();

            return;
        }

        const count = this._matches.length;
        this._active = (this._active + step + count) % count;
        this.render();
    }

    private onKey(event: KeyboardEvent): void {
        const handlers: Record<string, () => boolean> = {
            [Keys.Down]: () => {
                this.move(1);

                return true;
            },
            [Keys.Up]: () => {
                this.move(-1);

                return true;
            },
            [Keys.Enter]: () => this.pickActive(),
            [Keys.Tab]: () => {
                this.pickActive();

                return false;
            },
            [Keys.Escape]: () => {
                const wasOpen = !this.list.hidden;
                this.close();

                return wasOpen;
            },
        };
        const handled = handlers[event.key]?.() ?? false;
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private pickActive(): boolean {
        const value = this.list.hidden ? undefined : this._matches[this._active];
        if (value === undefined) {
            return false;
        }

        this.pick(value);

        return true;
    }

    private render(): void {
        const listId = this.list.id;
        this.list.replaceChildren(...this._matches.map((match, index) => buildElement("li", {
            className: "suggestion-item",
            text: match,
            attributes: {
                id: `${listId}-${index}`,
                role: "option",
                "aria-selected": String(index === this._active),
            },
            listeners: {
                mousedown: event => {
                    event.preventDefault();
                    this.pick(match);
                },
            },
        })));
        if (this._active === NoActive) {
            this.input.removeAttribute("aria-activedescendant");

            return;
        }

        this.input.setAttribute("aria-activedescendant", `${listId}-${this._active}`);
        this.list.children[this._active]?.scrollIntoView({
            block: "nearest",
        });
    }
}

export const SuggestionInput = {
    build(args: SuggestionInputArguments): HTMLElement {
        const popup = new SuggestionPopup(args);

        return buildElement("span", {
            className: args.wrapperClassName === undefined ? WrapperClass : `${WrapperClass} ${args.wrapperClassName}`,
            children: [
                popup.input,
                popup.list,
            ],
        });
    },
};
