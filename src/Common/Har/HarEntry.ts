import type { HarRequest } from './HarRequest';
import type { HarResponse } from './HarResponse';
import type { HarTimings } from './HarTimings';

export interface HarEntry {
    startedDateTime: string;
    time: number;
    request: HarRequest;
    response: HarResponse;
    cache: Record<string, never>;
    timings: HarTimings;
    _resourceType: string;
    _error?: string;
}
