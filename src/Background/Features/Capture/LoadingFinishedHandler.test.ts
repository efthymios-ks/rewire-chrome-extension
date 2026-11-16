import type { Protocol } from 'devtools-protocol';
import { describe, expect, test, vi } from 'vitest';
import { DefaultResponseBodyReader } from './DefaultResponseBodyReader';
import { DefaultTimelineStore } from './DefaultTimelineStore';
import { LoadingFinishedHandler } from './LoadingFinishedHandler';
import type { CapturedBody, ReadAsyncOptions, ResponseBodyReader } from './ResponseBodyReader';
import { TIMELINE_LIMITS } from './TimelineLimits';
import { Result } from '../../../Common/Results/Result';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import { aSummary } from '../../../TestData';
import { aTimelineRecord, createDebuggerClientMock } from '../../BackgroundTestData';

const TAB_ID = 7;
const REQUEST_ID = 'request-1';
const PAGE_HTML = '<!doctype html><title>Flights</title><form method="post"></form>';

function storeWithPage(): DefaultTimelineStore {
    const store = new DefaultTimelineStore();
    store.add(aTimelineRecord({
        summary: aSummary({
            url: 'https://shop.example.com/',
            resourceType: 'Document',
            contentKind: CONTENT_KIND.Other,
            state: TIMELINE_ENTRY_STATE.Pending,
            mimeType: 'text/html',
            durationInMilliseconds: null,
        }),
        responseBody: null,
    }));

    return store;
}

function aFinishedEvent(): Protocol.Network.LoadingFinishedEvent {
    return {
        requestId: REQUEST_ID,
        timestamp: 100.25,
        encodedDataLength: PAGE_HTML.length,
    };
}

function readerReturning(captured: CapturedBody) {
    const readAsync = vi
        .fn<(options: ReadAsyncOptions) => Promise<CapturedBody>>()
        .mockResolvedValue(captured);
    const reader: ResponseBodyReader = {
        readAsync,
    };

    return {
        reader,
        readAsync,
    };
}

describe('LoadingFinishedHandler', () => {
    test('handleAsync_WhenTheRecordIsKnown_ShouldCompleteItWithTheBody', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord({
            summary: aSummary({
                state: TIMELINE_ENTRY_STATE.Pending,
                durationInMilliseconds: null,
            }),
            responseBody: null,
        }));
        const { reader, readAsync } = readerReturning({
            body: '{"id":42}',
            note: 'Body truncated to 10 characters.',
        });
        const handler = new LoadingFinishedHandler(store, reader);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ {
                requestId: REQUEST_ID,
                timestamp: 100.5,
                encodedDataLength: 9,
            },
        );

        // Assert
        expect(readAsync).toHaveBeenCalledWith({
            tabId: TAB_ID,
            requestId: REQUEST_ID,
            mimeType: 'application/json',
        });
        const record = store.get(TAB_ID, REQUEST_ID);
        expect(record?.responseBody).toBe('{"id":42}');
        expect(record?.responseBodyNote).toBe('Body truncated to 10 characters.');
        expect(record?.summary.state).toBe(TIMELINE_ENTRY_STATE.Completed);
        expect(record?.summary.durationInMilliseconds).toBe(500);
    });

    test('handleAsync_WhenAPageFinishes_ShouldKeepItsHtmlBody', async () => {
        // Arrange
        const store = storeWithPage();
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.ok({
            body: PAGE_HTML,
            base64Encoded: false,
        }));
        const handler = new LoadingFinishedHandler(store, new DefaultResponseBodyReader(client));

        // Act
        await handler.handleAsync(TAB_ID, aFinishedEvent());

        // Assert
        const record = store.get(TAB_ID, REQUEST_ID);
        expect(record?.responseBody).toBe(PAGE_HTML);
        expect(record?.responseBodyNote).toBeNull();
        expect(record?.summary.state).toBe(TIMELINE_ENTRY_STATE.Completed);
        expect(record?.summary.durationInMilliseconds).toBe(250);
    });

    test('handleAsync_WhenAPageIsOverTheBodyLimit_ShouldKeepItsCutHtmlWithANote', async () => {
        // Arrange
        const store = storeWithPage();
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.ok({
            body: PAGE_HTML.padEnd(TIMELINE_LIMITS.MaxBodyLength + 1, ' '),
            base64Encoded: false,
        }));
        const handler = new LoadingFinishedHandler(store, new DefaultResponseBodyReader(client));

        // Act
        await handler.handleAsync(TAB_ID, aFinishedEvent());

        // Assert
        const record = store.get(TAB_ID, REQUEST_ID);
        expect(record?.responseBody).toHaveLength(TIMELINE_LIMITS.MaxBodyLength);
        expect(record?.responseBody?.startsWith(PAGE_HTML)).toBe(true);
        expect(record?.responseBodyNote).toBe(
            `Body truncated to ${TIMELINE_LIMITS.MaxBodyLength} characters.`,
        );
    });

    test('handleAsync_WhenTheRecordIsUnknown_ShouldNotReadTheBody', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const { reader, readAsync } = readerReturning({
            body: null,
            note: null,
        });
        const handler = new LoadingFinishedHandler(store, reader);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ {
                requestId: REQUEST_ID,
                timestamp: 101,
                encodedDataLength: 0,
            },
        );

        // Assert
        expect(readAsync).not.toHaveBeenCalled();
        expect(store.get(TAB_ID, REQUEST_ID)).toBeUndefined();
    });
});
