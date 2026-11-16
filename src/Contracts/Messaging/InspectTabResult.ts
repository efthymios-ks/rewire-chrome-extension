import type { InspectionStatus } from '../Inspection/InspectionStatus';
import type { LiveSnapshot } from '../Live/LiveSnapshot';
import type { TimelineEntrySummary } from '../Timeline/TimelineEntrySummary';

export interface InspectTabResult {
    status: InspectionStatus;
    entries: TimelineEntrySummary[];
    live: LiveSnapshot;
}
