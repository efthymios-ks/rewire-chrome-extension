export const PANEL_COMMAND_TYPE = Object.freeze({
    InspectTab: 1,
    GetEntryDetail: 2,
    ClearTimeline: 3,
    KeepAlive: 4,
    SearchTimeline: 5,
    LogClientExchange: 6,
    GetTimelineDetails: 7,
    SendClientRequest: 8,
    SendPostMessage: 9,
    RemoveLiveChannels: 10,
    SetLiveListening: 11,
} as const);

export type PanelCommandType = (typeof PANEL_COMMAND_TYPE)[keyof typeof PANEL_COMMAND_TYPE];
