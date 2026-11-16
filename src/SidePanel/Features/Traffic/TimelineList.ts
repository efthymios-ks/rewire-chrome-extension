import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { buildElement } from '../../Core/Dom/buildElement';
import { ContextMenu } from '../../Core/Dom/ContextMenu';
import { EmptyState } from '../../Core/Dom/EmptyState';
import { RenderScheduler } from '../../Core/Dom/RenderScheduler';
import { Equalities } from '../../Core/Equalities';
import type { PanelContext } from '../Shell/PanelContext';
import { EntryContextMenu } from './EntryContextMenu';
import { EntrySelection } from './EntrySelection';
import { TimelineRow } from './TimelineRow';
import { VisibleEntries } from './VisibleEntries';

const NOT_SCROLLED = -1;

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
    private readonly _noListedCallsState: HTMLElement;
    private readonly _rows = new Map<string, RenderedRow>();
    private readonly _scheduler = new RenderScheduler(() => this.render());
    private readonly _contextMenu = new ContextMenu();
    private readonly _entryMenu: EntryContextMenu;
    private _scrolledSelectionCount = NOT_SCROLLED;

    constructor(context: PanelContext) {
        this._context = context;
        this._entryMenu = new EntryContextMenu(context);
        this._list = buildElement('ul', {
            className: 'timeline-list',
            attributes: {
                role: 'listbox',
                'aria-label': 'Captured API requests',
            },
        });
        this._emptyState = EmptyState.build(
            'No API calls yet. Fetch and XHR requests of this tab show up here.',
        );
        this._noListedCallsState = EmptyState.build('No calls match the filters and the search.');
        this.root = buildElement('div', {
            className: 'timeline',
            children: [
                this._list,
                this._emptyState,
                this._noListedCallsState,
            ],
        });

        context.store.select({
            selector: state => [
                state.entries,
                state.settings.pinnedEndpoints,
                state.contentFilter,
                state.frameFilter,
                state.selectedEntryId,
                state.selectionCount,
                state.search,
            ],
            listener: () => this._scheduler.schedule(),
            isEqual: Equalities.shallowArray,
        });
    }

    private render(): void {
        const state = this._context.store.getState();
        const entries = VisibleEntries.of(state);
        const visibleIds = new Set(entries.map(entry => entry.id));
        [...this._rows.keys()]
            .filter(entryId => !visibleIds.has(entryId))
            .forEach(entryId => this._rows.delete(entryId));

        const elements = entries.map(entry => {
            const element = this.rowFor(
                /* entry: */ entry,
                /* isPinned: */ state.settings.pinnedEndpoints.includes(entry.endpointKey),
            );
            const isSelected = entry.id === state.selectedEntryId;
            element.setAttribute(
                /* qualifiedName: */ 'aria-selected',
                /* value: */ String(isSelected),
            );

            return element;
        });

        this._list.replaceChildren(...elements);
        this._emptyState.hidden = state.entries.length > 0;
        this._noListedCallsState.hidden = elements.length > 0 || state.entries.length === 0;
        this.scrollToNewSelection(state.selectionCount);
    }

    // Only a fresh pick scrolls, so incoming traffic never pulls the list back to the selected row.
    private scrollToNewSelection(selectionCount: number): void {
        if (selectionCount === this._scrolledSelectionCount) {
            return;
        }

        this._scrolledSelectionCount = selectionCount;
        this._list.querySelector('.timeline-row[aria-selected="true"]')?.scrollIntoView({
            block: 'nearest',
        });
    }

    private rowFor(entry: TimelineEntrySummary, isPinned: boolean): HTMLLIElement {
        const existing = this._rows.get(entry.id);
        if (
            existing != null
            && existing.entry === entry
            && existing.isPinned === isPinned
        ) {
            return existing.element;
        }

        const element = TimelineRow.build({
            entry,
            isPinned,
            actions: {
                onSelect: selected => EntrySelection.select(this._context.store, selected.id),
                onTogglePin: this._context.trafficFeatures.canPin
                    ? selected => void this._context.settingsService.togglePinAsync(selected.endpointKey)
                    : null,
                onContextMenu: ({ entry: selected, clientX, clientY }) => this._contextMenu.open({
                    items: this._entryMenu.itemsFor(selected),
                    clientX,
                    clientY,
                }),
            },
        });
        this._rows.set(
            /* key: */ entry.id,
            /* value: */ {
                entry,
                isPinned,
                element,
            },
        );

        return element;
    }
}
