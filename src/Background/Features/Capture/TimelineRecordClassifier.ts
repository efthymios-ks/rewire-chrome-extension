import type { TimelineRecord } from './TimelineRecord';

export interface TimelineRecordClassifier {
    reclassify(record: TimelineRecord): TimelineRecord;
}
