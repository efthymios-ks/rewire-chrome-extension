import type { Protocol } from 'devtools-protocol';
import { describe, expect, test } from 'vitest';
import { DefaultTimelineStore } from './DefaultTimelineStore';
import { LoadingFailedHandler } from './LoadingFailedHandler';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

const TAB_ID = 7;
const REQUEST_ID = 'request-1';

function anEvent(
    overrides: Partial<Protocol.Network.LoadingFailedEvent> = {},
): Protocol.Network.LoadingFailedEvent {
    return {
        requestId: REQUEST_ID,
        timestamp: 101,
        type: 'Fetch',
        errorText: 'net::ERR_FAILED',
        ...overrides,
    };
}

function storeWith(summary: Partial<TimelineEntrySummary>): DefaultTimelineStore {
    const timelineStore = new DefaultTimelineStore();
    timelineStore.add(aTimelineRecord({
        summary: aSummary({
            id: REQUEST_ID,
            state: TIMELINE_ENTRY_STATE.Pending,
            ...summary,
        }),
    }));

    return timelineStore;
}

describe('LoadingFailedHandler', () => {
    test('handleAsync_WhenAFailureEventArrives_ShouldMarkTheRecordAsFailed', async () => {
        // Arrange
        const timelineStore = storeWith({});
        const handler = new LoadingFailedHandler(timelineStore);

        // Act
        await handler.handleAsync(TAB_ID, anEvent());

        // Assert
        const record = timelineStore.get(TAB_ID, REQUEST_ID);
        expect(record?.summary.state).toBe(TIMELINE_ENTRY_STATE.Failed);
        expect(record?.summary.errorText).toBe('net::ERR_FAILED');
        expect(record?.summary.durationInMilliseconds).toBe(1000);
    });

    test('handleAsync_WhenTheEventIsCanceled_ShouldUseTheCanceledMessage', async () => {
        // Arrange
        const timelineStore = storeWith({});
        const handler = new LoadingFailedHandler(timelineStore);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ anEvent({
                canceled: true,
                errorText: 'net::ERR_ABORTED',
            }),
        );

        // Assert
        expect(timelineStore.get(TAB_ID, REQUEST_ID)?.summary.errorText).toBe('Canceled');
    });

    test('handleAsync_WhenAPageFailsToLoad_ShouldKeepTheDocumentAsFailed', async () => {
        // Arrange
        const timelineStore = storeWith({
            url: 'https://shop.example.invalid/',
            resourceType: 'Document',
            statusCode: null,
        });
        const handler = new LoadingFailedHandler(timelineStore);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ anEvent({
                type: 'Document',
                errorText: 'net::ERR_NAME_NOT_RESOLVED',
            }),
        );

        // Assert
        expect(timelineStore.get(TAB_ID, REQUEST_ID)?.summary).toMatchObject({
            resourceType: 'Document',
            state: TIMELINE_ENTRY_STATE.Failed,
            errorText: 'net::ERR_NAME_NOT_RESOLVED',
        });
    });

    test('handleAsync_WhenTheRequestWasNeverSeen_ShouldDoNothing', async () => {
        // Arrange
        const timelineStore = new DefaultTimelineStore();
        const handler = new LoadingFailedHandler(timelineStore);

        // Act
        await handler.handleAsync(TAB_ID, anEvent());

        // Assert
        expect(timelineStore.get(TAB_ID, REQUEST_ID)).toBeUndefined();
        expect(timelineStore.list(TAB_ID)).toHaveLength(0);
    });
});
