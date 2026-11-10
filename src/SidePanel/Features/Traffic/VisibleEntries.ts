import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import type { PanelState } from "../../Core/PanelState";
import { ContentFilters } from "./ContentFilters";

export const VisibleEntries = {
    of(state: PanelState): TimelineEntrySummary[] {
        const filter = ContentFilters.find(definition => definition.id === state.contentFilter);

        return state.entries
            .filter(entry => filter === undefined || filter.accepts(entry))
            .toReversed();
    },
};
