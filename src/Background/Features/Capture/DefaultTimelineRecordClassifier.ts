import type { ContentKindClassifier } from '../../../Common/Content/ContentKindClassifier';
import type { TimelineRecord } from './TimelineRecord';
import type { TimelineRecordClassifier } from './TimelineRecordClassifier';

export class DefaultTimelineRecordClassifier implements TimelineRecordClassifier {
    private readonly _classifier: ContentKindClassifier;

    constructor(classifier: ContentKindClassifier) {
        this._classifier = classifier;
    }

    reclassify(record: TimelineRecord): TimelineRecord {
        const contentKind = this._classifier.classify({
            url: record.summary.url,
            requestContentType: record.requestContentType,
            responseMimeType: record.summary.mimeType,
            requestBody: record.requestBody,
        });

        return {
            ...record,
            summary: {
                ...record.summary,
                contentKind,
            },
        };
    }
}
