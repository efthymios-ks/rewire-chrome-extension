export const VIEW_ID = Object.freeze({
    Traffic: 1,
    Rules: 2,
    CookieJar: 3,
    Client: 4,
    Jwt: 5,
    WsClient: 6,
    SseClient: 7,
    PostMessage: 8,
    HarInspector: 9,
} as const);

export type ViewId = (typeof VIEW_ID)[keyof typeof VIEW_ID];
