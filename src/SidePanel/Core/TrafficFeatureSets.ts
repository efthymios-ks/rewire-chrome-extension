import { deepFreeze } from '../../Common/Objects/deepFreeze';
import type { TrafficFeatures } from './TrafficFeatures';

export const TRAFFIC_FEATURE_SETS = deepFreeze({
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
} as const);
