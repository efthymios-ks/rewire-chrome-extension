import { buildElement } from '../../Core/Dom/buildElement';
import { HorizontalWheel } from '../../Core/Dom/HorizontalWheel';
import { Equalities } from '../../Core/Equalities';
import type { PanelContext } from './PanelContext';
import type { ViewDefinition } from './ViewDefinition';

export class NavigationTabs {
    readonly root: HTMLElement;

    constructor(context: PanelContext, definitions: ViewDefinition[]) {
        const tabs = definitions.map(definition => {
            const badge = buildElement('span', {
                className: 'tab-badge',
            });
            const tab = buildElement('button', {
                className: 'tab',
                attributes: {
                    type: 'button',
                    role: 'tab',
                },
                listeners: {
                    click: () => context.store.update(state => ({
                        ...state,
                        activeView: definition.id,
                    })),
                },
                children: [
                    definition.label,
                    badge,
                ],
            });

            return {
                definition,
                tab,
                badge,
            };
        });

        this.root = buildElement('nav', {
            className: 'view-tabs',
            attributes: {
                role: 'tablist',
            },
            children: tabs.map(item => item.tab),
        });
        HorizontalWheel.attach(this.root);

        context.store.select({
            selector: state => tabs.map(item => item.definition.badgeOf(state)),
            listener: badges => tabs.forEach((item, index) => {
                const text = badges[index] ?? '';
                item.badge.textContent = text;
                item.badge.hidden = text === '';
            }),
            isEqual: Equalities.shallowArray,
        });

        context.store.select({
            selector: state => state.activeView,
            listener: activeView => tabs.forEach(item => item.tab.setAttribute(
                /* qualifiedName: */ 'aria-selected',
                /* value: */ String(item.definition.id === activeView),
            )),
        });
    }
}
