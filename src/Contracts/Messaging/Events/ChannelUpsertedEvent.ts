import type { LiveChannel } from '../../Live/LiveChannel';
import type { WORKER_EVENT_TYPE } from '../WorkerEventType';

export interface ChannelUpsertedEvent {
    type: typeof WORKER_EVENT_TYPE.ChannelUpserted;
    channel: LiveChannel;
}
