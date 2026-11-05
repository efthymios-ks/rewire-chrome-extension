import type { InspectionStatus } from "../../Inspection/InspectionStatus";
import type { WorkerEventType } from "../WorkerEventType";

export interface InspectionChangedEvent {
    type: WorkerEventType.InspectionChanged;
    tabId: number;
    status: InspectionStatus;
}
