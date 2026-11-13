import type { PostMessageRecord } from "../../Live/PostMessageRecord";
import type { WorkerEventType } from "../WorkerEventType";

export interface PostMessageAddedEvent {
    type: WorkerEventType.PostMessageAdded;
    record: PostMessageRecord;
}
