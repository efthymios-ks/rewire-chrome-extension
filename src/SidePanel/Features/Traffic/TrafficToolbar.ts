import { DomainList } from "../../../Common/Urls/DomainList";
import type { ContentFilterId } from "../../Core/ContentFilterId";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { InputSync } from "../../Core/Dom/InputSync";
import { Equalities } from "../../Core/Equalities";
import { TrafficLayout } from "../../Core/TrafficLayout";
import type { PanelContext } from "../Shell/PanelContext";
import { ContentFilters } from "./ContentFilters";
import { VisibleEntries } from "./VisibleEntries";

export class TrafficToolbar {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const domainInput = FormControls.textInput({
            value: DomainList.format(context.settingsService.current().domainWhitelist),
            placeholder: "Only these domains, e.g. api.example.com",
            className: "input domain-filter",
            onChange: value => void context.settingsService.update(settings => ({
                ...settings,
                domainWhitelist: DomainList.parse(value),
            })),
        });
        domainInput.title = "Comma separated. Subdomains match too. Empty keeps every domain.";

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
        const layoutSelect = FormControls.select({
            value: String(context.store.getState().trafficLayout),
            options: [
                {
                    value: String(TrafficLayout.List),
                    label: "List",
                },
                {
                    value: String(TrafficLayout.Waterfall),
                    label: "Waterfall",
                },
            ],
            className: "input layout-select",
            onChange: value => context.store.update(state => ({
                ...state,
                trafficLayout: Number(value) as TrafficLayout,
            })),
        });
        layoutSelect.setAttribute("aria-label", "Layout");

        this.root = buildElement("div", {
            className: "traffic-toolbar",
            children: [
                domainInput,
                buildElement("div", {
                    className: "chip-group",
                    attributes: {
                        role: "group",
                        "aria-label": "Content filter",
                    },
                    children: filterButtons.map(item => item.button),
                }),
                count,
                layoutSelect,
                FormControls.button({
                    text: "Clear",
                    variant: ButtonVariants.Ghost,
                    title: "Clear the timeline of this tab",
                    onClick: () => void context.timelineSync.clear(),
                }),
            ],
        });

        context.store.select(
            state => state.settings.domainWhitelist,
            whitelist => InputSync.setValue(domainInput, DomainList.format(whitelist)),
            Equalities.shallowArray
        );

        context.store.select(
            state => state.contentFilter,
            (activeFilter: ContentFilterId) => filterButtons.forEach(item => item.button.setAttribute("aria-pressed", String(item.filter.id === activeFilter)))
        );

        context.store.select(
            state => [
                state.entries,
                state.settings.domainWhitelist,
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
