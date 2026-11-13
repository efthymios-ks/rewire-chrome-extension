import { buildElement } from "../../Core/Dom/ElementBuilder";
import { HorizontalWheel } from "../../Core/Dom/HorizontalWheel";
import { Equalities } from "../../Core/Equalities";
import type { PanelContext } from "./PanelContext";
import type { ViewDefinition } from "./ViewDefinition";

export class NavigationTabs {
    readonly root: HTMLElement;

    constructor(context: PanelContext, definitions: ViewDefinition[]) {
        const tabs = definitions.map(definition => {
            const badge = buildElement("span", {
                className: "tab-badge",
            });
            const tab = buildElement("button", {
                className: "tab",
                attributes: {
                    type: "button",
                    role: "tab",
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

        this.root = buildElement("nav", {
            className: "view-tabs",
            attributes: {
                role: "tablist",
            },
            children: tabs.map(item => item.tab),
        });
        HorizontalWheel.attach(this.root);

        context.store.select(
            state => tabs.map(item => item.definition.badgeOf(state)),
            badges => tabs.forEach((item, index) => {
                const text = badges[index] ?? "";
                item.badge.textContent = text;
                item.badge.hidden = text === "";
            }),
            Equalities.shallowArray
        );

        context.store.select(
            state => state.activeView,
            activeView => tabs.forEach(item => item.tab.setAttribute("aria-selected", String(item.definition.id === activeView)))
        );
    }
}
