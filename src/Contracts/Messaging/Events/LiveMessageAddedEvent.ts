import type { LiveMessage } from '../../Live/LiveMessage';
import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface LiveMessageAddedEvent {
    type: typeof WORKER_EVENT_TYPE.LiveMessageAdded;
    tabId: number;
    message: LiveMessage;
}
