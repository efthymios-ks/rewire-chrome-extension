import type { ContentFilterId } from "../../Core/ContentFilterId";
import { ContextMenu, type ContextMenuItem } from "../../Core/Dom/ContextMenu";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { Equalities } from "../../Core/Equalities";
import { FileClient, type IFileClient } from "../../Core/FileClient";
import { TrafficLayout } from "../../Core/TrafficLayout";
import type { PanelContext } from "../Shell/PanelContext";
import { ContentFilters } from "./ContentFilters";
import { HarExport } from "./HarExport";
import { VisibleEntries } from "./VisibleEntries";

const LayoutLabels: Record<TrafficLayout, string> = {
    [TrafficLayout.List]: "List",
    [TrafficLayout.Waterfall]: "Waterfall",
};

const LayoutChoices = [
    TrafficLayout.List,
    TrafficLayout.Waterfall,
];

function harItems(harExport: HarExport): ContextMenuItem[] {
    return [
        {
            label: "Download HAR",
            run: () => void harExport.download(false),
        },
        {
            label: "Copy HAR",
            run: () => void harExport.copy(false),
        },
        {
            label: "Download HAR with cookies and auth headers",
            run: () => void harExport.download(true),
        },
        {
            label: "Copy HAR with cookies and auth headers",
            run: () => void harExport.copy(true),
        },
    ];
}

function harButton(harExport: HarExport, menu: ContextMenu): HTMLButtonElement {
    const button = buildElement("button", {
        className: ButtonVariants.Ghost,
        text: "HAR",
        title: "Download or copy every captured call of this tab as a HAR file",
        attributes: {
            type: "button",
            "aria-haspopup": "menu",
        },
    });
    button.addEventListener("click", event => {
        event.stopPropagation();
        const bounds = button.getBoundingClientRect();
        menu.open(
            harItems(harExport),
            bounds.left,
            bounds.bottom
        );
    });

    return button;
}

function toolbarRow(children: HTMLElement[]): HTMLElement {
    return buildElement("div", {
        className: "traffic-toolbar-row",
        children,
    });
}

export class TrafficToolbar {
    readonly root: HTMLElement;

    constructor(context: PanelContext, fileClient: IFileClient = new FileClient()) {
        const harExport = new HarExport({
            context,
            fileClient,
            versionOf: () => chrome.runtime.getManifest().version,
            now: () => new Date(),
        });
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
            className: "input traffic-layout",
            options: LayoutChoices.map(layout => ({
                value: String(layout),
                label: LayoutLabels[layout],
            })),
            onChange: value => context.store.update(state => ({
                ...state,
                trafficLayout: Number(value) as TrafficLayout,
            })),
        });
        layoutSelect.setAttribute("aria-label", "Layout");

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
                    layoutSelect,
                    harButton(harExport, new ContextMenu()),
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
                layoutSelect.value = String(layout);
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
