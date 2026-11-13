import type { AppliedRule } from "../Rules/AppliedRule";
import type { ContentKind } from "./ContentKind";
import type { EntryFrame } from "./EntryFrame";
import type { TimelineEntryState } from "./TimelineEntryState";

export interface TimelineEntrySummary {
    id: string;
    tabId: number;
    method: string;
    url: string;
    host: string;
    path: string;
    endpointKey: string;
    resourceType: string;
    contentKind: ContentKind;
    state: TimelineEntryState;
    statusCode: number | null;
    statusText: string;
    mimeType: string;
    startedAt: string;
    durationInMilliseconds: number | null;
    appliedRules: AppliedRule[];
    isAnsweredByRule: boolean;
    redirectedFromUrl: string | null;
    errorText: string | null;
    frame: EntryFrame | null;
}
