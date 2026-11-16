import type { TimelineRecord } from './TimelineRecord';

export interface TimelineAdmission {
    admit(record: TimelineRecord): void;
}
