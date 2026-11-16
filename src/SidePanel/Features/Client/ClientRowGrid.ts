import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';

export interface RowCells {
    name: HTMLElement;
    value: HTMLElement;
}

export interface ClientRowGridArguments<TRow> {
    rows: TRow[];
    addLabel: string;
    removeLabel: string;
    emptyRow(): TRow;
    cellsOf(row: TRow, rerender: () => void): RowCells;
}

const REMOVE_ICON = '×';

export class ClientRowGrid<TRow> {
    readonly root: HTMLElement;

    private readonly _arguments: ClientRowGridArguments<TRow>;
    private readonly _list: HTMLElement;
    private _rows: TRow[];

    constructor(args: ClientRowGridArguments<TRow>) {
        this._arguments = args;
        this._rows = args.rows;
        this._list = buildElement('div', {
            className: 'client-rows',
        });
        this.root = buildElement('div', {
            className: 'client-row-grid',
            children: [
                this._list,
                buildElement('div', {
                    className: 'client-row-tools',
                    children: [
                        FormControls.button({
                            text: args.addLabel,
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => {
                                this._rows.push(args.emptyRow());
                                this.render();
                            },
                        }),
                    ],
                }),
            ],
        });
        this.render();
    }

    setRows(rows: TRow[]): void {
        this._rows = rows;
        this.render();
    }

    rows(): TRow[] {
        return this._rows;
    }

    private render(): void {
        if (this._rows.length === 0) {
            this._rows.push(this._arguments.emptyRow());
        }

        this._list.replaceChildren(...this._rows.map(row => {
            const cells = this._arguments.cellsOf(row, () => this.render());

            return buildElement('div', {
                className: 'client-row',
                children: [
                    cells.name,
                    cells.value,
                    buildElement('button', {
                        className: 'row-remove',
                        text: REMOVE_ICON,
                        attributes: {
                            type: 'button',
                            title: this._arguments.removeLabel,
                            'aria-label': this._arguments.removeLabel,
                        },
                        listeners: {
                            click: () => {
                                this._rows.splice(
                                    /* start: */ this._rows.indexOf(row),
                                    /* deleteCount: */ 1,
                                );
                                this.render();
                            },
                        },
                    }),
                ],
            });
        }));
    }
}
