import type { LiveChannel } from "../../Contracts/Live/LiveChannel";
import type { LiveMessage } from "../../Contracts/Live/LiveMessage";
import type { PostMessageRecord } from "../../Contracts/Live/PostMessageRecord";

export interface LiveState {
    channels: LiveChannel[];
    messages: LiveMessage[];
    postMessages: PostMessageRecord[];
}
