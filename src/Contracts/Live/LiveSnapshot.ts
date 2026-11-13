import type { LiveChannel } from "./LiveChannel";
import type { LiveMessage } from "./LiveMessage";
import type { PostMessageRecord } from "./PostMessageRecord";

export interface LiveSnapshot {
    channels: LiveChannel[];
    messages: LiveMessage[];
    postMessages: PostMessageRecord[];
}
