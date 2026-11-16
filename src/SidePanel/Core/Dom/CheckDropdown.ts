import { buildElement } from './buildElement';

const ESCAPE_KEY = 'Escape';
const VIEWPORT_MARGIN = 8;

export interface CheckChoice<TKey extends string> {
    key: TKey;
    label: string;
    title: string;
}

export interface CheckDropdownArguments<TKey extends string> {
    label: string;
    choices: readonly CheckChoice<TKey>[];
    selected: TKey[];
    onChange: (selected: TKey[]) => void;
}

interface CheckItem<TKey extends string> {
    choice: CheckChoice<TKey>;
    input: HTMLInputElement;
    row: HTMLLabelElement;
}

export class CheckDropdown<TKey extends string> {
    readonly root: HTMLDetailsElement;

    private readonly _label: string;
    private readonly _choices: readonly CheckChoice<TKey>[];
    private readonly _onChange: (selected: TKey[]) => void;
    private readonly _summary: HTMLElement;
    private readonly _panel: HTMLElement;
    private readonly _items: CheckItem<TKey>[];
    private _selected: TKey[] = [];
    private _pageListeners: AbortController | null = null;

    constructor({ label, choices, selected, onChange }: CheckDropdownArguments<TKey>) {
        this._label = label;
        this._choices = choices;
        this._onChange = onChange;
        this._summary = buildElement('summary', {
            className: 'pick-summary',
        });
        this._items = choices.map(choice => this.itemOf(choice));
        this._panel = buildElement('div', {
            className: 'pick-panel',
            attributes: {
                role: 'group',
                'aria-label': label,
            },
            children: this._items.map(item => item.row),
        });
        this.root = buildElement('details', {
            className: 'pick-list',
            children: [
                this._summary,
                this._panel,
            ],
            listeners: {
                toggle: () => this.handleToggle(),
            },
        });
        this.setSelected(selected);
    }

    setSelected(selected: TKey[]): void {
        this._selected = this._choices
            .map(choice => choice.key)
            .filter(key => selected.includes(key));
        this.render();
    }

    private itemOf(choice: CheckChoice<TKey>): CheckItem<TKey> {
        const input = buildElement('input', {
            attributes: {
                type: 'checkbox',
            },
            listeners: {
                change: () => this.toggle(choice.key, input),
            },
        });
        const row = buildElement('label', {
            className: 'checkbox pick-item',
            title: choice.title,
            children: [
                input,
                buildElement('span', {
                    text: choice.label,
                }),
            ],
        });

        return {
            choice,
            input,
            row,
        };
    }

    private toggle(key: TKey, input: HTMLInputElement): void {
        const next = this._choices
            .map(choice => choice.key)
            .filter(candidate => candidate === key ? input.checked : this._selected.includes(candidate));
        // An empty selection would leave the owner nothing to act on, so the last choice stays checked.
        if (next.length === 0) {
            input.checked = true;

            return;
        }

        this._selected = next;
        this.render();
        this._onChange([...next]);
    }

    private render(): void {
        const labels = this._choices
            .filter(choice => this._selected.includes(choice.key))
            .map(choice => choice.label);
        const summary = labels.length > 1 ? `${labels[0]} +${labels.length - 1}` : labels[0] ?? '';
        this._summary.textContent = summary;
        this._summary.setAttribute(
            /* qualifiedName: */ 'aria-label',
            /* value: */ `${this._label}: ${labels.join(', ')}`,
        );
        this._summary.title = `${this._label}: ${labels.join(', ')}`;
        this._items.forEach(item => {
            item.input.checked = this._selected.includes(item.choice.key);
        });
    }

    private handleToggle(): void {
        if (!this.root.open) {
            this._pageListeners?.abort();
            this._pageListeners = null;
            this._panel.style.left = '';

            return;
        }

        this.listenToThePage();
        this.keepThePanelOnScreen();
    }

    // Only while open, so a closed list leaves nothing attached to the page.
    private listenToThePage(): void {
        this._pageListeners?.abort();
        const pageListeners = new AbortController();
        const { signal } = pageListeners;
        document.addEventListener(
            /* type: */ 'pointerdown',
            /* listener: */ event => {
                if (!this.root.contains(event.target as Node)) {
                    this.root.open = false;
                }
            },
            /* options: */ { signal },
        );
        this.root.addEventListener(
            /* type: */ 'keydown',
            /* listener: */ event => {
                if (event.key === ESCAPE_KEY) {
                    this.root.open = false;
                    this._summary.focus();
                }
            },
            /* options: */ { signal },
        );
        this._pageListeners = pageListeners;
    }

    // A summary near the panel's right edge would otherwise push the list off screen.
    private keepThePanelOnScreen(): void {
        this._panel.style.left = '';
        const bounds = this._panel.getBoundingClientRect();
        const overflow = bounds.right - (window.innerWidth - VIEWPORT_MARGIN);
        const shift = Math.min(overflow, bounds.left - VIEWPORT_MARGIN);
        if (shift > 0) {
            this._panel.style.left = `${-shift}px`;
        }
    }
}
