import type { TimelineRecord } from './TimelineRecord';

export type RecordChange = (record: TimelineRecord) => TimelineRecord;
