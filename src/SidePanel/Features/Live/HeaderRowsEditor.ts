import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";

interface HeaderRow {
    name: HTMLInputElement;
    value: HTMLInputElement;
    root: HTMLElement;
}

const HeadersLabel = "Headers";

export class HeaderRowsEditor {
    readonly root: HTMLDetailsElement;

    private readonly _summary: HTMLElement;
    private readonly _rows: HTMLElement;
    private _items: HeaderRow[] = [];

    constructor() {
        this._summary = buildElement("summary", {
            text: `${HeadersLabel} · 0`,
        });
        this._rows = buildElement("div", {
            className: "header-rows",
        });
        this.root = buildElement("details", {
            className: "live-headers",
            children: [
                this._summary,
                this._rows,
                buildElement("div", {
                    className: "actions",
                    children: [
                        FormControls.button({
                            text: "Add header",
                            variant: ButtonVariants.Ghost,
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
            .filter(header => header.name !== "");
    }

    private add(): void {
        const item: HeaderRow = {
            name: FormControls.textInput({
                value: "",
                placeholder: "Header",
                onInput: () => this.refreshCount(),
            }),
            value: FormControls.textInput({
                value: "",
                placeholder: "Value",
            }),
            root: buildElement("div", {
                className: "header-row",
            }),
        };
        item.root.replaceChildren(
            item.name,
            item.value,
            FormControls.button({
                text: "×",
                variant: ButtonVariants.Ghost,
                title: "Remove header",
                onClick: () => this.remove(item),
            })
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
        this._summary.textContent = `${HeadersLabel} · ${this.values().length}`;
    }
}
