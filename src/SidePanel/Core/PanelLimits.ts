export const PanelLimits = {
    MaxTimelineEntries: 500,
    MaxPinnedEndpoints: 3,
    DetailLoadDelayInMilliseconds: 150,
    NoticeDurationInMilliseconds: 3000,
    UndoDurationInMilliseconds: 8000,
    SearchDebounceInMilliseconds: 300,
    KeepAliveIntervalInMilliseconds: 20_000,
    ReconnectDelayInMilliseconds: 1000,
    CommandTimeoutInMilliseconds: 30_000,
    TesterDebounceInMilliseconds: 250,
} as const;
