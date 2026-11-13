export interface TrafficFeatures {
    canPin: boolean;
    canMock: boolean;
    canExportHar: boolean;
    canClear: boolean;
    canFilterFrames: boolean;
}

export const TrafficFeatureSets = {
    Live: {
        canPin: true,
        canMock: true,
        canExportHar: true,
        canClear: true,
        canFilterFrames: true,
    } satisfies TrafficFeatures,
    HarFile: {
        canPin: false,
        canMock: false,
        canExportHar: false,
        canClear: false,
        canFilterFrames: false,
    } satisfies TrafficFeatures,
} as const;
