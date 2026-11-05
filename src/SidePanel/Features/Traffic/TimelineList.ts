import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import { ContextMenu } from "../../Core/Dom/ContextMenu";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { EmptyState } from "../../Core/Dom/EmptyState";
import { RenderScheduler } from "../../Core/Dom/RenderScheduler";
import { Equalities } from "../../Core/Equalities";
import type { PanelContext } from "../Shell/PanelContext";
import { EntryCodeCopier } from "./EntryCodeCopier";
import { EntrySelection } from "./EntrySelection";
import { TimelineRow } from "./TimelineRow";
import { VisibleEntries } from "./VisibleEntries";

interface RenderedRow {
    entry: TimelineEntrySummary;
    isPinned: boolean;
    element: HTMLLIElement;
}

export class TimelineList {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _list: HTMLUListElement;
    private readonly _emptyState: HTMLElement;
    private readonly _rows = new Map<string, RenderedRow>();
    private readonly _scheduler = new RenderScheduler(() => this.render());
    private readonly _contextMenu = new ContextMenu();
    private readonly _codeCopier: EntryCodeCopier;

    constructor(context: PanelContext) {
        this._context = context;
        this._codeCopier = new EntryCodeCopier(context);
        this._list = buildElement("ul", {
            className: "timeline-list",
            attributes: {
                role: "listbox",
                "aria-label": "Captured API requests",
            },
        });
        this._emptyState = EmptyState.build("No API calls yet. Fetch and XHR requests of this tab show up here.");
        this.root = buildElement("div", {
            className: "timeline",
            children: [
                this._list,
                this._emptyState,
            ],
        });

        context.store.select(
            state => [
                state.entries,
                state.settings.domainWhitelist,
                state.settings.pinnedEndpoints,
                state.contentFilter,
                state.selectedEntryId,
                state.search,
            ],
            () => this._scheduler.schedule(),
            Equalities.shallowArray
        );
    }

    private render(): void {
        const state = this._context.store.getState();
        const entries = VisibleEntries.of(state);
        const visibleIds = new Set(entries.map(entry => entry.id));
        [...this._rows.keys()]
            .filter(entryId => !visibleIds.has(entryId))
            .forEach(entryId => this._rows.delete(entryId));

        const matchedIds = new Set(state.search.matches.map(match => match.entryId));
        const elements = entries.map(entry => {
            const element = this.rowFor(entry, state.settings.pinnedEndpoints.includes(entry.endpointKey));
            const isSelected = entry.id === state.selectedEntryId;
            element.classList.toggle("selected", isSelected);
            element.classList.toggle("search-match", matchedIds.has(entry.id));
            element.setAttribute("aria-selected", String(isSelected));

            return element;
        });

        this._list.replaceChildren(...elements);
        this._emptyState.hidden = elements.length > 0;
        this._list.querySelector(".timeline-row.selected")?.scrollIntoView({
            block: "nearest",
        });
    }

    private rowFor(entry: TimelineEntrySummary, isPinned: boolean): HTMLLIElement {
        const existing = this._rows.get(entry.id);
        if (existing !== undefined && existing.entry === entry && existing.isPinned === isPinned) {
            return existing.element;
        }

        const element = TimelineRow.build(
            entry,
            isPinned,
            {
                onSelect: selected => EntrySelection.select(this._context.store, selected.id),
                onTogglePin: selected => void this._context.settingsService.togglePin(selected.endpointKey),
                onContextMenu: (
                    selected,
                    x,
                    y
                ) => this._contextMenu.open(
                    this._codeCopier.menuFor(selected),
                    x,
                    y
                ),
            }
        );
        this._rows.set(
            entry.id,
            {
                entry,
                isPinned,
                element,
            }
        );

        return element;
    }
}
