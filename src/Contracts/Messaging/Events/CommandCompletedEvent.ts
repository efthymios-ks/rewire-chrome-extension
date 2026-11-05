import type { Result } from "../../../Common/Results/Result";
import type { WorkerEventType } from "../WorkerEventType";

export interface CommandCompletedEvent {
    type: WorkerEventType.CommandCompleted;
    correlationId: string;
    result: Result<unknown>;
}
