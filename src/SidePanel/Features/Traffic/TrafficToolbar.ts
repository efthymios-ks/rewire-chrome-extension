import type { ContentFilterId } from "../../Core/ContentFilterId";
import { ContextMenu, type ContextMenuItem } from "../../Core/Dom/ContextMenu";
import { buildElement, type ElementChild } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { MenuButton } from "../../Core/Dom/MenuButton";
import { Equalities } from "../../Core/Equalities";
import { FileClient, type IFileClient } from "../../Core/FileClient";
import { FrameFilters } from "../../Core/FrameFilters";
import { type ITabOpener, TabOpener } from "../../Core/TabOpener";
import { TrafficLayout } from "../../Core/TrafficLayout";
import { FrameSelect } from "../Frames/FrameSelect";
import { PageFrames } from "../Frames/PageFrames";
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

function frameControls(context: PanelContext, tabOpener: ITabOpener): HTMLElement[] {
    const select = new FrameSelect(value => context.store.update(state => ({
        ...state,
        frameFilter: value,
    })));
    const openButton = FormControls.button({
        text: "Open frame",
        variant: ButtonVariants.Ghost,
        title: "Open the picked iframe in a new tab",
        onClick: () => {
            const { entries, frameFilter } = context.store.getState();
            const frame = PageFrames
                .of(entries.map(entry => entry.frame))
                .find(candidate => candidate.id === frameFilter);
            if (frame === undefined) {
                return;
            }

            void tabOpener
                .open(frame.url)
                .then(opened => {
                    if (opened.hasErrors) {
                        context.notifier.show(opened.error);
                    }
                });
        },
    });

    context.store.select(
        state => [
            state.entries,
            state.frameFilter,
        ],
        () => {
            const { entries, frameFilter } = context.store.getState();
            const frames = PageFrames.of(entries.map(entry => entry.frame));
            const isKnown = PageFrames.isFixed(frameFilter) || frames.some(frame => frame.id === frameFilter);
            if (!isKnown) {
                context.store.update(state => ({
                    ...state,
                    frameFilter: FrameFilters.All,
                }));

                return;
            }

            select.update(frames, frameFilter);
            openButton.hidden = PageFrames.isFixed(frameFilter);
        },
        Equalities.shallowArray
    );

    return [
        select.root,
        openButton,
    ];
}

function toolbarRow(children: ElementChild[]): HTMLElement {
    return buildElement("div", {
        className: "traffic-toolbar-row",
        children,
    });
}

export class TrafficToolbar {
    readonly root: HTMLElement;

    constructor(
        context: PanelContext,
        fileClient: IFileClient = new FileClient(),
        tabOpener: ITabOpener = new TabOpener()
    ) {
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
                    ...context.trafficFeatures.canFilterFrames ? frameControls(context, tabOpener) : [],
                    context.trafficFeatures.canExportHar
                        ? MenuButton.build({
                            text: "HAR",
                            title: "Download or copy every captured call of this tab as a HAR file",
                            menu: new ContextMenu(),
                            items: () => harItems(harExport),
                        })
                        : null,
                    context.trafficFeatures.canClear
                        ? FormControls.button({
                            text: "Clear",
                            variant: ButtonVariants.Ghost,
                            title: "Clear the timeline of this tab",
                            onClick: () => void context.timelineSync.clear(),
                        })
                        : null,
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
                state.frameFilter,
            ],
            () => {
                const state = context.store.getState();
                count.textContent = `${VisibleEntries.of(state).length} / ${state.entries.length}`;
            },
            Equalities.shallowArray
        );
    }
}
