import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import type { TimelineRecord } from './TimelineRecord';

export interface SimulateResponseOptions {
    record: TimelineRecord;
    status: number;
    headers: HeaderEntry[];
}

export interface BrowserRuleSimulator {
    simulateRequest(record: TimelineRecord): TimelineAnnotation | null;
    simulateResponse(options: SimulateResponseOptions): TimelineAnnotation | null;
}
