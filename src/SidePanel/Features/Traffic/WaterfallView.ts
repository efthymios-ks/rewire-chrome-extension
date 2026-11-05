import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { RenderScheduler } from "../../Core/Dom/RenderScheduler";
import { Equalities } from "../../Core/Equalities";
import { DurationText } from "../../Core/Formatting/DurationText";
import { StatusAppearance } from "../../Core/Formatting/StatusAppearance";
import type { PanelContext } from "../Shell/PanelContext";
import { AppliedRuleText } from "./AppliedRuleText";
import { EntrySelection } from "./EntrySelection";
import { VisibleEntries } from "./VisibleEntries";

const ColorModes = {
    Status: "status",
    Type: "type",
} as const;

const ZoomStep = 1.5;
const MinZoom = 1;
const MaxZoom = 64;
const MinBarWidthPercent = 0.3;
const PendingDurationInMilliseconds = 0;
const PercentScale = 100;

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
            duration: entry.durationInMilliseconds ?? PendingDurationInMilliseconds,
        }))
        .sort((left, right) => left.start - right.start || left.duration - right.duration);
}

function typeClassOf(entry: TimelineEntrySummary): string {
    return `type-${entry.resourceType.toLowerCase() || "other"}`;
}

export class WaterfallView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _rows: HTMLElement;
    private readonly _zoomLabel: HTMLElement;
    private readonly _scheduler = new RenderScheduler(() => this.render());
    private _colorMode: string = ColorModes.Status;
    private _zoom = MinZoom;

    constructor(context: PanelContext) {
        this._context = context;
        this._rows = buildElement("div", {
            className: "waterfall-rows",
        });
        this._zoomLabel = buildElement("span", {
            className: "muted",
        });

        this.root = buildElement("div", {
            className: "waterfall",
            children: [
                buildElement("div", {
                    className: "waterfall-tools",
                    children: [
                        FormControls.select({
                            value: this._colorMode,
                            options: [
                                {
                                    value: ColorModes.Status,
                                    label: "Color by status",
                                },
                                {
                                    value: ColorModes.Type,
                                    label: "Color by type",
                                },
                            ],
                            onChange: value => {
                                this._colorMode = value;
                                this._scheduler.schedule();
                            },
                        }),
                        FormControls.button({
                            text: "Zoom out",
                            variant: ButtonVariants.Ghost,
                            onClick: () => this.setZoom(this._zoom / ZoomStep),
                        }),
                        FormControls.button({
                            text: "Zoom in",
                            variant: ButtonVariants.Ghost,
                            onClick: () => this.setZoom(this._zoom * ZoomStep),
                        }),
                        FormControls.button({
                            text: "Reset zoom",
                            variant: ButtonVariants.Ghost,
                            title: "Fit the whole waterfall in view",
                            onClick: () => this.setZoom(MinZoom),
                        }),
                        this._zoomLabel,
                    ],
                }),
                buildElement("div", {
                    className: "waterfall-scroll",
                    attributes: {
                        tabindex: "0",
                        "aria-label": "Waterfall, scroll sideways to pan",
                    },
                    children: [this._rows],
                }),
            ],
        });

        context.store.select(
            state => [
                state.entries,
                state.settings.domainWhitelist,
                state.contentFilter,
                state.selectedEntryId,
            ],
            () => this._scheduler.schedule(),
            Equalities.shallowArray
        );
    }

    private setZoom(zoom: number): void {
        this._zoom = Math.min(MaxZoom, Math.max(MinZoom, zoom));
        this._scheduler.schedule();
    }

    private render(): void {
        const state = this._context.store.getState();
        const bars = barsOf(VisibleEntries.of(state));
        this._zoomLabel.textContent = `${Math.round(this._zoom * PercentScale)}%`;
        this._rows.style.width = `${this._zoom * PercentScale}%`;
        if (bars.length === 0) {
            this._rows.replaceChildren(buildElement("p", {
                className: "muted",
                text: "No requests to chart yet.",
            }));

            return;
        }

        const origin = bars[0]!.start;
        const end = Math.max(...bars.map(bar => bar.start + bar.duration));
        const span = Math.max(1, end - origin);

        this._rows.replaceChildren(...bars.map(bar => {
            const left = ((bar.start - origin) / span) * PercentScale;
            const width = Math.max(MinBarWidthPercent, (bar.duration / span) * PercentScale);
            const colorClass = this._colorMode === ColorModes.Status ? StatusAppearance.classOf(bar.entry) : typeClassOf(bar.entry);
            const hasRules = bar.entry.appliedRules.length > 0;
            const isSelected = bar.entry.id === state.selectedEntryId;

            return buildElement("button", {
                className: isSelected ? "waterfall-row selected" : "waterfall-row",
                title: [
                    `${bar.entry.method} ${bar.entry.url}`,
                    `${StatusAppearance.textOf(bar.entry)}, ${DurationText.of(bar.entry.durationInMilliseconds)}`,
                    hasRules ? `Rules: ${AppliedRuleText.names(bar.entry.appliedRules)}` : "",
                ]
                    .filter(line => line !== "")
                    .join("\n"),
                attributes: {
                    type: "button",
                },
                listeners: {
                    click: () => EntrySelection.select(this._context.store, bar.entry.id),
                },
                children: [
                    buildElement("span", {
                        className: `waterfall-bar ${colorClass}`,
                        attributes: {
                            style: `left: ${left}%; width: ${width}%;`,
                        },
                        children: [
                            hasRules
                                ? buildElement("span", {
                                    className: "rule-marker",
                                    attributes: {
                                        "aria-label": "Rules acted on this call",
                                    },
                                })
                                : null,
                        ],
                    }),
                    buildElement("span", {
                        className: "waterfall-label",
                        text: `${bar.entry.method} ${bar.entry.path}`,
                    }),
                ],
            });
        }));
    }
}
