export const CHANGE_AREA = Object.freeze({
    Url: 1,
    RequestHeader: 2,
    RequestBody: 3,
    Status: 4,
    ResponseHeader: 5,
    ResponseBody: 6,
    Outcome: 7,
} as const);

export type ChangeArea = (typeof CHANGE_AREA)[keyof typeof CHANGE_AREA];
