import { DomainMatcher } from "../../../Common/Urls/DomainMatcher";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import type { PanelState } from "../../Core/PanelState";
import { ContentFilters } from "./ContentFilters";

export const VisibleEntries = {
    of(state: PanelState): TimelineEntrySummary[] {
        const filter = ContentFilters.find(definition => definition.id === state.contentFilter);
        const whitelist = state.settings.domainWhitelist;

        return state.entries
            .filter(entry => (whitelist.length === 0 || DomainMatcher.matchesAny(entry.host, whitelist))
                && (filter === undefined || filter.accepts(entry))
            )
            .toReversed();
    },
};
