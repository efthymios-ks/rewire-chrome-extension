import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';

interface HeaderRow {
    name: HTMLInputElement;
    value: HTMLInputElement;
    root: HTMLElement;
}

const HEADERS_LABEL = 'Headers';

export class HeaderRowsEditor {
    readonly root: HTMLDetailsElement;

    private readonly _summary: HTMLElement;
    private readonly _rows: HTMLElement;
    private _items: HeaderRow[] = [];

    constructor() {
        this._summary = buildElement('summary', {
            text: `${HEADERS_LABEL} · 0`,
        });
        this._rows = buildElement('div', {
            className: 'header-rows',
        });
        this.root = buildElement('details', {
            className: 'live-headers',
            children: [
                this._summary,
                this._rows,
                buildElement('div', {
                    className: 'actions',
                    children: [
                        FormControls.button({
                            text: 'Add header',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => this.add(),
                        }),
                    ],
                }),
            ],
        });
    }

    values(): HeaderEntry[] {
        return this._items
            .map(item => ({
                name: item.name.value.trim(),
                value: item.value.value,
            }))
            .filter(header => header.name !== '');
    }

    private add(): void {
        const item: HeaderRow = {
            name: FormControls.textInput({
                value: '',
                placeholder: 'Header',
                onInput: () => this.refreshCount(),
            }),
            value: FormControls.textInput({
                value: '',
                placeholder: 'Value',
            }),
            root: buildElement('div', {
                className: 'header-row',
            }),
        };
        item.root.replaceChildren(
            /* nodes: */ item.name,
            /* nodes: */ item.value,
            /* nodes: */ FormControls.button({
                text: '×',
                variant: BUTTON_VARIANTS.Ghost,
                title: 'Remove header',
                ariaLabel: 'Remove header',
                onClick: () => this.remove(item),
            }),
        );
        this._items = [
            ...this._items,
            item,
        ];
        this._rows.append(item.root);
        this.root.open = true;
        this.refreshCount();
        item.name.focus();
    }

    private remove(item: HeaderRow): void {
        this._items = this._items.filter(candidate => candidate !== item);
        item.root.remove();
        this.refreshCount();
    }

    private refreshCount(): void {
        this._summary.textContent = `${HEADERS_LABEL} · ${this.values().length}`;
    }
}
