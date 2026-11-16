import { ByteSize } from '../../../Common/Encoding/ByteSize';
import type { EventStreamEvent } from '../../../Common/EventStream/EventStreamEvent';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';
import type { LiveMessageDraft } from './LiveMessageDraft';

export interface ToDraftOptions {
    requestId: string;
    event: EventStreamEvent;
    at: Date;
}

export const EventStreamMessages = {
    toDraft({ requestId, event, at }: ToDraftOptions): LiveMessageDraft {
        return {
            channelId: requestId,
            direction: LIVE_MESSAGE_DIRECTION.Received,
            at: at.toISOString(),
            data: event.data,
            size: event.data == null ? 0 : ByteSize.ofText(event.data),
            opcode: null,
            eventName: event.event,
            eventId: event.id,
            retry: event.retry,
        };
    },
};
