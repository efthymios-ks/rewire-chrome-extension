import type { InspectionStatus } from '../../Inspection/InspectionStatus';
import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface InspectionChangedEvent {
    type: typeof WORKER_EVENT_TYPE.InspectionChanged;
    tabId: number;
    status: InspectionStatus;
}
