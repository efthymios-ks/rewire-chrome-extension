import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface TimelineClearedEvent {
    type: typeof WORKER_EVENT_TYPE.TimelineCleared;
    tabId: number;
}
