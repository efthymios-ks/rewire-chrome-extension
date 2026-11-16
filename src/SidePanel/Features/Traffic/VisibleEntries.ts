import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import type { PanelState } from '../../Core/PanelState';
import { PageFrames } from '../Frames/PageFrames';
import { CONTENT_FILTERS } from './ContentFilters';
import { SearchFilter } from './SearchFilter';

export const VisibleEntries = {
    of(state: PanelState): TimelineEntrySummary[] {
        const filter = CONTENT_FILTERS.find(definition => definition.id === state.contentFilter);
        const matchedIds = SearchFilter.matchedIdsOf(state.search);

        return state.entries
            .filter(entry => filter == null || filter.accepts(entry))
            .filter(entry => PageFrames.accepts(entry.frame, state.frameFilter))
            .filter(entry => matchedIds == null || matchedIds.has(entry.id))
            .toReversed();
    },
};
