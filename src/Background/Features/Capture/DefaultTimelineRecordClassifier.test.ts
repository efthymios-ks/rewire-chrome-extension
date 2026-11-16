import { describe, expect, test, vi } from 'vitest';
import { DefaultTimelineRecordClassifier } from './DefaultTimelineRecordClassifier';
import type { ContentKindClassifier } from '../../../Common/Content/ContentKindClassifier';
import { DefaultContentKindClassifier } from '../../../Common/Content/DefaultContentKindClassifier';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

describe('DefaultTimelineRecordClassifier', () => {
    test('reclassify_WhenTheSignalsChanged_ShouldReturnACopyWithTheNewContentKind', () => {
        // Arrange
        const classifier = new DefaultTimelineRecordClassifier(new DefaultContentKindClassifier());
        const record = aTimelineRecord({
            summary: aSummary({
                mimeType: 'text/html',
                contentKind: CONTENT_KIND.Json,
            }),
            responseBody: '<html></html>',
        });

        // Act
        const reclassified = classifier.reclassify(record);

        // Assert
        expect(reclassified.summary.contentKind).toBe(CONTENT_KIND.Other);
        expect(reclassified.responseBody).toBe('<html></html>');
        expect(record.summary.contentKind).toBe(CONTENT_KIND.Json);
    });

    test('reclassify_WhenCalled_ShouldPassTheRecordSignalsToTheClassifier', () => {
        // Arrange
        const contentKindClassifier: ContentKindClassifier = {
            classify: vi.fn().mockReturnValue(CONTENT_KIND.FormData),
        };
        const classifier = new DefaultTimelineRecordClassifier(contentKindClassifier);
        const record = aTimelineRecord({
            requestContentType: 'application/x-www-form-urlencoded',
            requestBody: 'name=Ada',
        });

        // Act
        const reclassified = classifier.reclassify(record);

        // Assert
        expect(contentKindClassifier.classify).toHaveBeenCalledWith({
            url: record.summary.url,
            requestContentType: 'application/x-www-form-urlencoded',
            responseMimeType: 'application/json',
            requestBody: 'name=Ada',
        });
        expect(reclassified.summary.contentKind).toBe(CONTENT_KIND.FormData);
    });
});
