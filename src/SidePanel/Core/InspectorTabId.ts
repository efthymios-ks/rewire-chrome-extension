export const INSPECTOR_TAB_ID = Object.freeze({
    General: 1,
    RequestHeaders: 2,
    RequestBody: 3,
    ResponseHeaders: 4,
    ResponseBody: 5,
    Code: 6,
} as const);

export type InspectorTabId = (typeof INSPECTOR_TAB_ID)[keyof typeof INSPECTOR_TAB_ID];
