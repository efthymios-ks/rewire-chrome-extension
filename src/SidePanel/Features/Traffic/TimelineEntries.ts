import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import { PanelLimits } from "../../Core/PanelLimits";
import type { PanelState } from "../../Core/PanelState";

export const TimelineEntries = {
    upsert(entries: TimelineEntrySummary[], entry: TimelineEntrySummary): TimelineEntrySummary[] {
        const index = entries.findIndex(candidate => candidate.id === entry.id);
        if (index === -1) {
            return [
                ...entries,
                entry,
            ].slice(-PanelLimits.MaxTimelineEntries);
        }

        return entries.map(candidate => candidate.id === entry.id ? entry : candidate);
    },

    selectedOf(state: PanelState): TimelineEntrySummary | null {
        return state.entries.find(entry => entry.id === state.selectedEntryId) ?? null;
    },

    latestFor(entries: TimelineEntrySummary[], endpointKey: string): TimelineEntrySummary | null {
        return entries.findLast(entry => entry.endpointKey === endpointKey) ?? null;
    },
};
