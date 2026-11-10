import type { ContentFilterId } from "../../Core/ContentFilterId";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { Equalities } from "../../Core/Equalities";
import { TrafficLayout } from "../../Core/TrafficLayout";
import type { PanelContext } from "../Shell/PanelContext";
import { ContentFilters } from "./ContentFilters";
import { VisibleEntries } from "./VisibleEntries";

const LayoutLabels: Record<TrafficLayout, string> = {
    [TrafficLayout.List]: "List",
    [TrafficLayout.Waterfall]: "Waterfall",
};

function toolbarRow(children: HTMLElement[]): HTMLElement {
    return buildElement("div", {
        className: "traffic-toolbar-row",
        children,
    });
}

export class TrafficToolbar {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const filterButtons = ContentFilters.map(filter => ({
            filter,
            button: buildElement("button", {
                className: "chip",
                text: filter.label,
                attributes: {
                    type: "button",
                },
                listeners: {
                    click: () => context.store.update(state => ({
                        ...state,
                        contentFilter: filter.id,
                    })),
                },
            }),
        }));

        const count = buildElement("span", {
            className: "entry-count",
        });
        const layoutSwitch = FormControls.toggleSwitch({
            checked: context.store.getState().trafficLayout === TrafficLayout.Waterfall,
            label: LayoutLabels[context.store.getState().trafficLayout],
            onChange: checked => context.store.update(state => ({
                ...state,
                trafficLayout: checked ? TrafficLayout.Waterfall : TrafficLayout.List,
            })),
        });
        const layoutInput = layoutSwitch.querySelector("input")!;
        const layoutLabel = layoutSwitch.querySelector("span")!;
        layoutInput.setAttribute("aria-label", "Waterfall layout");

        this.root = buildElement("div", {
            className: "traffic-toolbar",
            children: [
                toolbarRow([
                    buildElement("div", {
                        className: "chip-group",
                        attributes: {
                            role: "group",
                            "aria-label": "Content filter",
                        },
                        children: filterButtons.map(item => item.button),
                    }),
                    count,
                ]),
                toolbarRow([
                    layoutSwitch,
                    FormControls.button({
                        text: "Clear",
                        variant: ButtonVariants.Ghost,
                        title: "Clear the timeline of this tab",
                        onClick: () => void context.timelineSync.clear(),
                    }),
                ]),
            ],
        });

        context.store.select(
            state => state.trafficLayout,
            layout => {
                layoutInput.checked = layout === TrafficLayout.Waterfall;
                layoutLabel.textContent = LayoutLabels[layout];
            }
        );

        context.store.select(
            state => state.contentFilter,
            (activeFilter: ContentFilterId) => filterButtons.forEach(item => item.button.setAttribute("aria-pressed", String(item.filter.id === activeFilter)))
        );

        context.store.select(
            state => [
                state.entries,
                state.contentFilter,
            ],
            () => {
                const state = context.store.getState();
                count.textContent = `${VisibleEntries.of(state).length} / ${state.entries.length}`;
            },
            Equalities.shallowArray
        );
    }
}
