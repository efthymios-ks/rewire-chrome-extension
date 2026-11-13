import type { LiveChannel } from "../../Live/LiveChannel";
import type { WorkerEventType } from "../WorkerEventType";

export interface ChannelUpsertedEvent {
    type: WorkerEventType.ChannelUpserted;
    channel: LiveChannel;
}
