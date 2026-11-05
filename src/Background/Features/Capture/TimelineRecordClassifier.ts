import type { IContentKindClassifier } from "../../../Common/Content/ContentKindClassifier";
import type { TimelineRecord } from "./TimelineRecord";

export interface ITimelineRecordClassifier {
    reclassify(record: TimelineRecord): TimelineRecord;
}

export class TimelineRecordClassifier implements ITimelineRecordClassifier {
    private readonly _classifier: IContentKindClassifier;

    constructor(classifier: IContentKindClassifier) {
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
