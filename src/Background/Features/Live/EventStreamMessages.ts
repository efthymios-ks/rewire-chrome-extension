import { ByteSize } from "../../../Common/Encoding/ByteSize";
import type { EventStreamEvent } from "../../../Common/EventStream/EventStreamEvent";
import { LiveMessageDirection } from "../../../Contracts/Live/LiveMessageDirection";
import type { LiveMessageDraft } from "./LiveStore";

export const EventStreamMessages = {
    toDraft(
        requestId: string,
        event: EventStreamEvent,
        at: Date
    ): LiveMessageDraft {
        return {
            channelId: requestId,
            direction: LiveMessageDirection.Received,
            at: at.toISOString(),
            data: event.data,
            size: event.data === null ? 0 : ByteSize.ofText(event.data),
            opcode: null,
            eventName: event.event,
            eventId: event.id,
            retry: event.retry,
        };
    },
};
