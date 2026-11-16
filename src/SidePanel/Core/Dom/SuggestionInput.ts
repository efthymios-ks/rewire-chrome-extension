import { buildElement } from './buildElement';
import { FormControls } from './FormControls';
import { SuggestionMatches } from './SuggestionMatches';

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

const DEFAULT_INPUT_CLASS = 'input';
const WRAPPER_CLASS = 'suggestion-input';

const NO_ACTIVE = -1;

const KEYS = Object.freeze({
    Down: 'ArrowDown',
    Up: 'ArrowUp',
    Enter: 'Enter',
    Tab: 'Tab',
    Escape: 'Escape',
} as const);

let nextListId = 1;

function sourceValues(source: SuggestionSource): readonly string[] {
    return typeof source === 'function' ? source() : source;
}

class SuggestionPopup {
    readonly input: HTMLInputElement;
    readonly list: HTMLUListElement;

    private readonly _args: SuggestionInputArguments;
    private _matches: string[] = [];
    private _active = NO_ACTIVE;
    private _windowListeners: AbortController | null = null;

    constructor(args: SuggestionInputArguments) {
        this._args = args;
        const listId = `suggestions-${nextListId++}`;
        this.input = FormControls.textInput({
            value: args.value,
            placeholder: args.placeholder,
            className: args.className ?? DEFAULT_INPUT_CLASS,
            onInput: value => {
                args.onInput(value);
                this.open();
            },
        });
        this.input.autocomplete = 'off';
        this.input.spellcheck = false;
        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-autocomplete', 'list');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-controls', listId);
        if (args.label != null) {
            this.input.setAttribute('aria-label', args.label);
        }

        this.list = buildElement('ul', {
            className: 'suggestion-list',
            attributes: {
                id: listId,
                role: 'listbox',
            },
        });
        this.list.hidden = true;

        this.input.addEventListener('focus', () => this.open());
        this.input.addEventListener('blur', () => this.close());
        this.input.addEventListener('keydown', event => this.onKey(event));
    }

    private open(): void {
        this._matches = SuggestionMatches.of(
            /* source: */ sourceValues(this._args.suggestions),
            /* text: */ this.input.value,
        );
        this._active = NO_ACTIVE;
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
        this.input.setAttribute('aria-expanded', 'true');
        this.listenToTheWindow();
    }

    private close(): void {
        this._windowListeners?.abort();
        this._windowListeners = null;
        this.list.hidden = true;
        this._active = NO_ACTIVE;
        this.input.setAttribute('aria-expanded', 'false');
        this.input.removeAttribute('aria-activedescendant');
    }

    // Only while open, so an input that is rebuilt leaves nothing attached to the window.
    private listenToTheWindow(): void {
        if (this._windowListeners != null) {
            return;
        }

        const windowListeners = new AbortController();
        const { signal } = windowListeners;
        window.addEventListener(
            /* type: */ 'scroll',
            /* listener: */ event => this.closeOnOutsideScroll(event),
            /* options: */ {
                capture: true,
                signal,
            },
        );
        window.addEventListener(
            /* type: */ 'resize',
            /* listener: */ () => this.close(),
            /* options: */ { signal },
        );
        this._windowListeners = windowListeners;
    }

    // Arrow keys scroll the list itself, which must not close it.
    private closeOnOutsideScroll(event: Event): void {
        if (event.target instanceof Node && this.list.contains(event.target)) {
            return;
        }

        this.close();
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
        const from = this._active === NO_ACTIVE && step < 0 ? 0 : this._active;
        this._active = (from + step + count) % count;
        this.render();
    }

    private onKey(event: KeyboardEvent): void {
        const handlers: Record<string, () => boolean> = {
            [KEYS.Down]: () => {
                this.move(1);

                return true;
            },
            [KEYS.Up]: () => {
                this.move(-1);

                return true;
            },
            [KEYS.Enter]: () => this.pickActive(),
            [KEYS.Tab]: () => {
                this.pickActive();

                return false;
            },
            [KEYS.Escape]: () => {
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
        if (value == null) {
            return false;
        }

        this.pick(value);

        return true;
    }

    private render(): void {
        const listId = this.list.id;
        this.list.replaceChildren(...this._matches.map((match, index) => buildElement('li', {
            className: 'suggestion-item',
            text: match,
            attributes: {
                id: `${listId}-${index}`,
                role: 'option',
                'aria-selected': String(index === this._active),
            },
            listeners: {
                mousedown: event => {
                    event.preventDefault();
                    this.pick(match);
                },
            },
        })));
        if (this._active === NO_ACTIVE) {
            this.input.removeAttribute('aria-activedescendant');

            return;
        }

        this.input.setAttribute('aria-activedescendant', `${listId}-${this._active}`);
        this.list.children[this._active]?.scrollIntoView({
            block: 'nearest',
        });
    }
}

export const SuggestionInput = {
    build(args: SuggestionInputArguments): HTMLElement {
        const popup = new SuggestionPopup(args);

        return buildElement('span', {
            className: args.wrapperClassName == null
                ? WRAPPER_CLASS
                : `${WRAPPER_CLASS} ${args.wrapperClassName}`,
            children: [
                popup.input,
                popup.list,
            ],
        });
    },
};
