import type { PostMessageRecord } from '../../Live/PostMessageRecord';
import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface PostMessageAddedEvent {
    type: typeof WORKER_EVENT_TYPE.PostMessageAdded;
    record: PostMessageRecord;
}
