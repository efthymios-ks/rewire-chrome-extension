export const LIVE_CHANNEL_KIND = Object.freeze({
    WebSocket: 1,
    EventStream: 2,
} as const);

export type LiveChannelKind = (typeof LIVE_CHANNEL_KIND)[keyof typeof LIVE_CHANNEL_KIND];
