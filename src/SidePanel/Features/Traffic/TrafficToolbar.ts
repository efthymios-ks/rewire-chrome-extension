import { ChromeFileClient } from '../../Core/ChromeFileClient';
import { ChromeTabOpener } from '../../Core/ChromeTabOpener';
import { buildElement, type ElementChild } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { ContextMenu } from '../../Core/Dom/ContextMenu';
import type { ContextMenuItem } from '../../Core/Dom/ContextMenuItem';
import { FormControls } from '../../Core/Dom/FormControls';
import { MenuButton } from '../../Core/Dom/MenuButton';
import { Equalities } from '../../Core/Equalities';
import type { FileClient } from '../../Core/FileClient';
import { FRAME_FILTERS } from '../../Core/FrameFilters';
import type { TabOpener } from '../../Core/TabOpener';
import { TRAFFIC_LAYOUT, type TrafficLayout } from '../../Core/TrafficLayout';
import { FrameSelect } from '../Frames/FrameSelect';
import { PageFrames } from '../Frames/PageFrames';
import type { PanelContext } from '../Shell/PanelContext';
import { CONTENT_FILTERS } from './ContentFilters';
import { HarExport } from './HarExport';
import { VisibleEntries } from './VisibleEntries';

const LAYOUT_LABELS: Record<TrafficLayout, string> = Object.freeze({
    [TRAFFIC_LAYOUT.List]: 'List',
    [TRAFFIC_LAYOUT.Waterfall]: 'Waterfall',
});

const LAYOUT_CHOICES = [
    TRAFFIC_LAYOUT.List,
    TRAFFIC_LAYOUT.Waterfall,
];

function harItems(harExport: HarExport): ContextMenuItem[] {
    return [
        {
            label: 'Download HAR',
            run: () => void harExport.downloadAsync(false),
        },
        {
            label: 'Copy HAR',
            run: () => void harExport.copyAsync(false),
        },
        {
            label: 'Download HAR with cookies and auth headers',
            run: () => void harExport.downloadAsync(true),
        },
        {
            label: 'Copy HAR with cookies and auth headers',
            run: () => void harExport.copyAsync(true),
        },
    ];
}

function frameControls(context: PanelContext, tabOpener: TabOpener): HTMLElement[] {
    const select = new FrameSelect(value => context.store.update(state => ({
        ...state,
        frameFilter: value,
    })));
    const openButton = FormControls.button({
        text: 'Open frame',
        variant: BUTTON_VARIANTS.Ghost,
        title: 'Open the picked iframe in a new tab',
        onClick: async () => {
            const { entries, frameFilter } = context.store.getState();
            const frame = PageFrames
                .of(entries.map(entry => entry.frame))
                .find(candidate => candidate.id === frameFilter);
            if (frame == null) {
                return;
            }

            const opened = await tabOpener.openAsync(frame.url);
            if (opened.hasErrors) {
                context.notifier.show(opened.error);
            }
        },
    });

    context.store.select({
        selector: state => [
            state.entries,
            state.frameFilter,
        ],
        listener: () => {
            const { entries, frameFilter } = context.store.getState();
            const frames = PageFrames.of(entries.map(entry => entry.frame));
            const isKnown = PageFrames.isFixed(frameFilter) || frames.some(frame => frame.id === frameFilter);
            if (!isKnown) {
                context.store.update(state => ({
                    ...state,
                    frameFilter: FRAME_FILTERS.All,
                }));

                return;
            }

            select.update(frames, frameFilter);
            openButton.hidden = PageFrames.isFixed(frameFilter);
        },
        isEqual: Equalities.shallowArray,
    });

    return [
        select.root,
        openButton,
    ];
}

function toolbarRow(children: ElementChild[]): HTMLElement {
    return buildElement('div', {
        className: 'traffic-toolbar-row',
        children,
    });
}

export interface TrafficToolbarDependencies {
    context: PanelContext;
    fileClient?: FileClient;
    tabOpener?: TabOpener;
}

export class TrafficToolbar {
    readonly root: HTMLElement;

    constructor({
        context,
        fileClient = new ChromeFileClient(),
        tabOpener = new ChromeTabOpener(),
    }: TrafficToolbarDependencies) {
        const harExport = new HarExport({
            context,
            fileClient,
            versionOf: () => chrome.runtime.getManifest().version,
            now: () => new Date(),
        });
        const filterButtons = CONTENT_FILTERS.map(filter => ({
            filter,
            button: buildElement('button', {
                className: 'chip',
                text: filter.label,
                attributes: {
                    type: 'button',
                },
                listeners: {
                    click: () => context.store.update(state => ({
                        ...state,
                        contentFilter: filter.id,
                    })),
                },
            }),
        }));

        const count = buildElement('span', {
            className: 'entry-count',
        });
        const layoutSelect = FormControls.select({
            value: String(context.store.getState().trafficLayout),
            className: 'input traffic-layout',
            options: LAYOUT_CHOICES.map(layout => ({
                value: String(layout),
                label: LAYOUT_LABELS[layout],
            })),
            onChange: value => context.store.update(state => ({
                ...state,
                trafficLayout: Number(value) as TrafficLayout,
            })),
        });
        layoutSelect.setAttribute('aria-label', 'Layout');

        this.root = buildElement('div', {
            className: 'traffic-toolbar',
            children: [
                toolbarRow([
                    buildElement('div', {
                        className: 'chip-group',
                        attributes: {
                            role: 'group',
                            'aria-label': 'Content filter',
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
                            text: 'HAR',
                            title: 'Download or copy every captured call of this tab as a HAR file',
                            menu: new ContextMenu(),
                            items: () => harItems(harExport),
                        })
                        : null,
                    context.trafficFeatures.canClear
                        ? FormControls.button({
                            text: 'Clear',
                            variant: BUTTON_VARIANTS.Ghost,
                            title: 'Clear the timeline of this tab',
                            onClick: () => void context.timelineSync.clearAsync(),
                        })
                        : null,
                ]),
            ],
        });

        context.store.select({
            selector: state => state.trafficLayout,
            listener: layout => {
                layoutSelect.value = String(layout);
            },
        });

        context.store.select({
            selector: state => state.contentFilter,
            listener: activeFilter => filterButtons.forEach(item => item.button.setAttribute(
                /* qualifiedName: */ 'aria-pressed',
                /* value: */ String(item.filter.id === activeFilter),
            )),
        });

        context.store.select({
            selector: state => [
                state.entries,
                state.contentFilter,
                state.frameFilter,
                state.search,
            ],
            listener: () => {
                const state = context.store.getState();
                count.textContent = `${VisibleEntries.of(state).length} / ${state.entries.length}`;
            },
            isEqual: Equalities.shallowArray,
        });
    }
}
