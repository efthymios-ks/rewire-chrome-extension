export const LIVE_MESSAGE_DIRECTION = Object.freeze({
    Sent: 1,
    Received: 2,
} as const);

export type LiveMessageDirection = (typeof LIVE_MESSAGE_DIRECTION)[keyof typeof LIVE_MESSAGE_DIRECTION];
