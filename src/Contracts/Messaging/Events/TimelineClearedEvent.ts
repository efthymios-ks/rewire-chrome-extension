import type { WorkerEventType } from "../WorkerEventType";

export interface TimelineClearedEvent {
    type: WorkerEventType.TimelineCleared;
    tabId: number;
}
