import { describe, expect, test, vi } from 'vitest';
import { ResponseReceivedHandler } from './ResponseReceivedHandler';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import { aSummary } from '../../../TestData';
import {
    aResponseReceivedEvent,
    aTimelineRecord,
    type CaptureParts,
    captureParts,
} from '../../BackgroundTestData';

const TAB_ID = 7;
const PAGE_URL = 'https://shop.example.com/';
const API_DOCUMENT_URL = 'https://jsonplaceholder.typicode.com/posts';
const FRAME_ANNOTATION: TimelineAnnotation = {
    appliedRules: [
        {
            ruleId: 'embed-1',
            ruleName: 'Allow embedding',
            engine: 1,
            note: 'Response header',
        },
    ],
    changes: [
        {
            area: CHANGE_AREA.ResponseHeader,
            name: 'X-Frame-Options',
            before: 'DENY',
            after: null,
        },
    ],
    isAnsweredByRule: false,
};

function handlerOf(parts: CaptureParts): ResponseReceivedHandler {
    return new ResponseReceivedHandler({
        timelineStore: parts.timelineStore,
        recordClassifier: parts.recordClassifier,
        browserRuleSimulator: parts.browserRuleSimulator,
    });
}

function addDocument(parts: CaptureParts, url: string): void {
    parts.timelineStore.add(aTimelineRecord({
        summary: aSummary({
            url,
            resourceType: 'Document',
            contentKind: CONTENT_KIND.Other,
            state: TIMELINE_ENTRY_STATE.Pending,
            statusCode: null,
            statusText: '',
            mimeType: '',
        }),
        requestHeaders: [],
        responseBody: null,
    }));
}

describe('ResponseReceivedHandler', () => {
    test('handleAsync_WhenAPageAnswersWithHtml_ShouldKeepItWithItsStatus', async () => {
        // Arrange
        const parts = captureParts();
        addDocument(parts, PAGE_URL);
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aResponseReceivedEvent({
                url: PAGE_URL,
                mimeType: 'text/html',
            }),
        );

        // Assert
        const entries = parts.timelineStore.list(TAB_ID);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            url: PAGE_URL,
            resourceType: 'Document',
            statusCode: 200,
            statusText: 'OK',
            mimeType: 'text/html',
            contentKind: CONTENT_KIND.Other,
        });
    });

    test('handleAsync_WhenAnAddressBarDocumentAnswersWithJson_ShouldClassifyItAsJson', async () => {
        // Arrange
        const parts = captureParts();
        addDocument(parts, API_DOCUMENT_URL);
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aResponseReceivedEvent({
                url: API_DOCUMENT_URL,
                mimeType: 'application/json',
            }),
        );

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.summary.mimeType).toBe('application/json');
        expect(record?.summary.contentKind).toBe(CONTENT_KIND.Json);
    });

    test('handleAsync_WhenABrowserRuleChangesAPageResponse_ShouldAnnotateTheDocument', async () => {
        // Arrange
        const parts = captureParts();
        parts.browserRuleSimulator.simulateResponse = vi.fn().mockReturnValue(FRAME_ANNOTATION);
        addDocument(parts, PAGE_URL);
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aResponseReceivedEvent({
                url: PAGE_URL,
                mimeType: 'text/html',
            }),
        );

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['embed-1']);
        expect(record?.changes).toEqual(FRAME_ANNOTATION.changes);
    });

    test('handleAsync_WhenTheRequestWasNeverSeen_ShouldIgnoreIt', async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(TAB_ID, aResponseReceivedEvent());

        // Assert
        expect(parts.timelineStore.list(TAB_ID)).toHaveLength(0);
    });
});
