import type { LiveMessage } from "../../Live/LiveMessage";
import type { WorkerEventType } from "../WorkerEventType";

export interface LiveMessageAddedEvent {
    type: WorkerEventType.LiveMessageAdded;
    tabId: number;
    message: LiveMessage;
}
