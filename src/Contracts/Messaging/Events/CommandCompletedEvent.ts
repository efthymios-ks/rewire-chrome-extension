import type { Result } from '../../../Common/Results/Result';
import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface CommandCompletedEvent {
    type: typeof WORKER_EVENT_TYPE.CommandCompleted;
    correlationId: string;
    result: Result<unknown>;
}
