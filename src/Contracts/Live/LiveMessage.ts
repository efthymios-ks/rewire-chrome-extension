import type { LiveMessageDirection } from "./LiveMessageDirection";

export interface LiveMessage {
    id: string;
    channelId: string;
    direction: LiveMessageDirection;
    at: string;
    data: string | null;
    size: number;
    opcode: number | null;
    eventName: string | null;
    eventId: string | null;
    retry: number | null;
}
