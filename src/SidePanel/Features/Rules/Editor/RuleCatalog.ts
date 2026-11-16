import type { RuleType } from '../../../../Common/Rules/Types/RuleType';
import { RuleTypeRegistry } from '../../../../Common/Rules/Types/RuleTypeRegistry';
import { buildElement } from '../../../Core/Dom/buildElement';
import { FormControls } from '../../../Core/Dom/FormControls';

function matches(type: RuleType, text: string): boolean {
    const needle = text.trim().toLowerCase();

    return needle === '' || `${type.label} ${type.description}`.toLowerCase().includes(needle);
}

export class RuleCatalog {
    readonly root: HTMLElement;

    private readonly _groups: HTMLElement;
    private readonly _onPick: (type: RuleType) => void;

    constructor(onPick: (type: RuleType) => void) {
        this._onPick = onPick;
        this._groups = buildElement('div', {
            className: 'catalog-groups',
        });
        const search = FormControls.searchInput({
            value: '',
            placeholder: 'Search rule types',
            ariaLabel: 'Search rule types',
            onInput: value => this.render(value),
        });

        this.root = buildElement('div', {
            className: 'rule-catalog',
            children: [
                search,
                this._groups,
            ],
        });
        this.render('');
    }

    private render(text: string): void {
        const groups = RuleTypeRegistry
            .groups()
            .map(group => ({
                ...group,
                types: group.types.filter(type => matches(type, text)),
            }))
            .filter(group => group.types.length > 0);

        this._groups.replaceChildren(...groups.map(group => buildElement('section', {
            className: 'catalog-group',
            children: [
                buildElement('h3', {
                    className: 'catalog-group-title',
                    text: group.label,
                }),
                buildElement('div', {
                    className: 'catalog-items',
                    children: group.types.map(type => buildElement('button', {
                        className: 'catalog-item',
                        attributes: {
                            type: 'button',
                        },
                        listeners: {
                            click: () => this._onPick(type),
                        },
                        children: [
                            buildElement('strong', {
                                text: type.label,
                            }),
                            buildElement('span', {
                                className: 'catalog-item-description',
                                text: type.description,
                            }),
                        ],
                    })),
                }),
            ],
        })));
    }
}
