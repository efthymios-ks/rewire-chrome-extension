import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import { RenderScheduler } from '../../Core/Dom/RenderScheduler';
import { Equalities } from '../../Core/Equalities';
import { DurationText } from '../../Core/Formatting/DurationText';
import { StatusAppearance } from '../../Core/Formatting/StatusAppearance';
import type { PanelContext } from '../Shell/PanelContext';
import { AppliedRuleText } from './AppliedRuleText';
import { EntrySelection } from './EntrySelection';
import { VisibleEntries } from './VisibleEntries';

const COLOR_MODES = Object.freeze({
    Status: 'status',
    Type: 'type',
} as const);

const ZOOM_STEP = 1.5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 64;
const MIN_BAR_WIDTH_PERCENT = 0.3;
const PENDING_DURATION_IN_MILLISECONDS = 0;
const PERCENT_SCALE = 100;
const NO_LISTED_CALLS_TEXT = 'No calls match the filters and the search.';

interface WaterfallBar {
    entry: TimelineEntrySummary;
    start: number;
    duration: number;
}

function barsOf(entries: TimelineEntrySummary[]): WaterfallBar[] {
    return entries
        .map(entry => ({
            entry,
            start: Date.parse(entry.startedAt),
            duration: entry.durationInMilliseconds ?? PENDING_DURATION_IN_MILLISECONDS,
        }))
        .sort((left, right) => {
            const byStart = left.start - right.start;

            return byStart === 0 || Number.isNaN(byStart) ? left.duration - right.duration : byStart;
        });
}

function typeClassOf(entry: TimelineEntrySummary): string {
    const resourceType = entry.resourceType.toLowerCase();

    return `type-${resourceType === '' ? 'other' : resourceType}`;
}

export class WaterfallView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _rows: HTMLElement;
    private readonly _zoomLabel: HTMLElement;
    private readonly _scheduler = new RenderScheduler(() => this.render());
    private _colorMode: string = COLOR_MODES.Status;
    private _zoom = MIN_ZOOM;

    constructor(context: PanelContext) {
        this._context = context;
        this._rows = buildElement('div', {
            className: 'waterfall-rows',
        });
        this._zoomLabel = buildElement('span', {
            className: 'waterfall-zoom',
        });

        this.root = buildElement('div', {
            className: 'waterfall',
            children: [
                buildElement('div', {
                    className: 'waterfall-tools',
                    children: [
                        FormControls.select({
                            value: this._colorMode,
                            options: [
                                {
                                    value: COLOR_MODES.Status,
                                    label: 'Color by status',
                                },
                                {
                                    value: COLOR_MODES.Type,
                                    label: 'Color by type',
                                },
                            ],
                            onChange: value => {
                                this._colorMode = value;
                                this._scheduler.schedule();
                            },
                        }),
                        FormControls.button({
                            text: 'Zoom out',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => this.setZoom(this._zoom / ZOOM_STEP),
                        }),
                        FormControls.button({
                            text: 'Zoom in',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => this.setZoom(this._zoom * ZOOM_STEP),
                        }),
                        FormControls.button({
                            text: 'Reset zoom',
                            variant: BUTTON_VARIANTS.Ghost,
                            title: 'Fit the whole waterfall in view',
                            onClick: () => this.setZoom(MIN_ZOOM),
                        }),
                        this._zoomLabel,
                    ],
                }),
                buildElement('div', {
                    className: 'waterfall-scroll',
                    attributes: {
                        tabindex: '0',
                        'aria-label': 'Waterfall, scroll sideways to pan',
                    },
                    children: [this._rows],
                }),
            ],
        });

        context.store.select({
            selector: state => [
                state.entries,
                state.contentFilter,
                state.frameFilter,
                state.search,
                state.selectedEntryId,
            ],
            listener: () => this._scheduler.schedule(),
            isEqual: Equalities.shallowArray,
        });
    }

    private setZoom(zoom: number): void {
        this._zoom = Math.min(
            /* values: */ MAX_ZOOM,
            /* values: */ Math.max(MIN_ZOOM, zoom),
        );
        this._scheduler.schedule();
    }

    private render(): void {
        const state = this._context.store.getState();
        const bars = barsOf(VisibleEntries.of(state));
        this._zoomLabel.textContent = `${Math.round(this._zoom * PERCENT_SCALE)}%`;
        this._rows.style.width = `${this._zoom * PERCENT_SCALE}%`;
        if (bars.length === 0) {
            this._rows.replaceChildren(buildElement('p', {
                className: 'empty-note',
                text: state.entries.length === 0 ? 'No requests to chart yet.' : NO_LISTED_CALLS_TEXT,
            }));

            return;
        }

        const origin = bars[0]!.start;
        const end = Math.max(...bars.map(bar => bar.start + bar.duration));
        const span = Math.max(1, end - origin);

        this._rows.replaceChildren(...bars.map(bar => {
            const left = ((bar.start - origin) / span) * PERCENT_SCALE;
            const width = Math.max(MIN_BAR_WIDTH_PERCENT, (bar.duration / span) * PERCENT_SCALE);
            const colorClass = this._colorMode === COLOR_MODES.Status
                ? StatusAppearance.classOf(bar.entry)
                : typeClassOf(bar.entry);
            const hasRules = bar.entry.appliedRules.length > 0;
            const isSelected = bar.entry.id === state.selectedEntryId;
            const statusText = StatusAppearance.textOf(bar.entry);
            const durationText = DurationText.of(bar.entry.durationInMilliseconds);

            return buildElement('button', {
                className: 'waterfall-row',
                title: [
                    `${bar.entry.method} ${bar.entry.url}`,
                    `${statusText}, ${durationText}`,
                    hasRules ? `Rules: ${AppliedRuleText.names(bar.entry.appliedRules)}` : '',
                ]
                    .filter(line => line !== '')
                    .join('\n'),
                attributes: {
                    type: 'button',
                    ...(isSelected ? { 'data-selected': '' } : {}),
                },
                listeners: {
                    click: () => EntrySelection.select(this._context.store, bar.entry.id),
                },
                children: [
                    buildElement('span', {
                        className: `waterfall-bar ${colorClass}`,
                        attributes: {
                            style: `left: ${left}%; width: ${width}%;`,
                        },
                        children: [
                            hasRules
                                ? buildElement('span', {
                                    className: 'rule-marker',
                                    attributes: {
                                        'aria-label': 'Rules acted on this call',
                                    },
                                })
                                : null,
                        ],
                    }),
                    buildElement('span', {
                        className: 'waterfall-label',
                        text: `${bar.entry.method} ${bar.entry.path}`,
                    }),
                ],
            });
        }));
    }
}
