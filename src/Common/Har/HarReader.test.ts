import { describe, expect, test } from 'vitest';
import { DefaultContentKindClassifier } from '../Content/DefaultContentKindClassifier';
import { JsonText } from '../Json/JsonText';
import { HarBuilder } from './HarBuilder';
import { HarReader } from './HarReader';
import { HAR_TAB_ID } from './HarTabId';
import { CONTENT_KIND } from '../../Contracts/Timeline/ContentKind';
import { TIMELINE_ENTRY_STATE } from '../../Contracts/Timeline/TimelineEntryState';
import { aDetail, aSummary } from '../../TestData';

const classifier = new DefaultContentKindClassifier();

function harOf(entries: unknown[]): string {
    return JSON.stringify({
        log: {
            version: '1.2',
            entries,
        },
    });
}

function anEntry(changes: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        startedDateTime: '2026-11-12T10:00:00.000Z',
        time: 120.4,
        _resourceType: 'fetch',
        request: {
            method: 'post',
            url: 'https://api.example.com/api/v1/orders?page=2',
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
            postData: {
                mimeType: 'application/json',
                text: '{"sku":"CAP"}',
            },
        },
        response: {
            status: 201,
            statusText: 'Created',
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json; charset=utf-8',
                },
            ],
            content: {
                size: 9,
                mimeType: 'application/json; charset=utf-8',
                text: '{"id":7}',
            },
        },
        ...changes,
    };
}

describe('HarReader', () => {
    test('read_WhenAnEntryIsComplete_ShouldMapItToACallDetail', () => {
        // Arrange
        const text = harOf([anEntry()]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.summary).toEqual({
            id: 'har-1',
            tabId: HAR_TAB_ID,
            method: 'POST',
            url: 'https://api.example.com/api/v1/orders?page=2',
            host: 'api.example.com',
            path: '/api/v1/orders?page=2',
            endpointKey: 'POST https://api.example.com/api/v1/orders',
            resourceType: 'Fetch',
            contentKind: CONTENT_KIND.Json,
            state: TIMELINE_ENTRY_STATE.Completed,
            statusCode: 201,
            statusText: 'Created',
            mimeType: 'application/json',
            startedAt: '2026-11-12T10:00:00.000Z',
            durationInMilliseconds: 120,
            appliedRules: [],
            isAnsweredByRule: false,
            redirectedFromUrl: null,
            errorText: null,
            frame: null,
        });
        expect(detail?.requestBody).toBe('{"sku":"CAP"}');
        expect(detail?.requestBodyNote).toBeNull();
        expect(detail?.requestBodyBase64).toBeNull();
        expect(detail?.responseBody).toBe('{"id":7}');
        expect(detail?.requestHeaders).toEqual([
            {
                name: 'Content-Type',
                value: 'application/json',
            },
        ]);
    });

    test('read_WhenATextBodyIsBase64_ShouldDecodeIt', () => {
        // Arrange
        const text = harOf([
            anEntry({
                response: {
                    status: 200,
                    content: {
                        mimeType: 'application/json',
                        encoding: 'base64',
                        text: btoa('{"ok":true}'),
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        expect(read.hasErrors ? null : read.value[0]?.responseBody).toBe('{"ok":true}');
    });

    test('read_WhenABinaryBodyIsBase64_ShouldSayItIsNotShown', () => {
        // Arrange
        const text = harOf([
            anEntry({
                response: {
                    status: 200,
                    content: {
                        size: 2048,
                        mimeType: 'image/png',
                        encoding: 'base64',
                        text: 'iVBORw0KGgo=',
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.responseBody).toBeNull();
        expect(detail?.responseBodyNote).toBe('Binary body (2048 bytes), not shown.');
    });

    test('read_WhenATextRequestBodyIsBase64_ShouldDecodeIt', () => {
        // Arrange
        const text = harOf([
            anEntry({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/api/v1/orders',
                    postData: {
                        mimeType: 'application/json',
                        encoding: 'base64',
                        text: btoa('{"sku":"CAP"}'),
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.requestBody).toBe('{"sku":"CAP"}');
        expect(detail?.requestBodyNote).toBeNull();
        expect(detail?.requestBodyBase64).toBeNull();
    });

    test('read_WhenABinaryRequestBodyIsBase64_ShouldSayItIsNotShown', () => {
        // Arrange
        const text = harOf([
            anEntry({
                request: {
                    method: 'PUT',
                    url: 'https://api.example.com/api/v1/avatar',
                    bodySize: 8,
                    postData: {
                        mimeType: 'image/png',
                        encoding: 'base64',
                        text: 'iVBORw0KGgo=',
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.requestBody).toBeNull();
        expect(detail?.requestBodyNote).toBe('Binary body (8 bytes), not shown.');
        expect(detail?.requestBodyBase64).toBeNull();
    });

    test('read_WhenTheRequestHasNoBody_ShouldLeaveTheBodyAndItsNoteEmpty', () => {
        // Arrange
        const text = harOf([
            anEntry({
                request: {
                    method: 'GET',
                    url: 'https://api.example.com/api/v1/orders',
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.requestBody).toBeNull();
        expect(detail?.requestBodyNote).toBeNull();
        expect(detail?.requestBodyBase64).toBeNull();
    });

    test('read_WhenACallFailed_ShouldMarkItFailedWithItsError', () => {
        // Arrange
        const text = harOf([
            anEntry({
                time: -1,
                _error: 'net::ERR_CONNECTION_REFUSED',
                response: {
                    status: 0,
                    content: {
                        comment: 'No body.',
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const summary = read.hasErrors ? undefined : read.value[0]?.summary;
        expect(summary?.state).toBe(TIMELINE_ENTRY_STATE.Failed);
        expect(summary?.statusCode).toBeNull();
        expect(summary?.errorText).toBe('net::ERR_CONNECTION_REFUSED');
        expect(summary?.durationInMilliseconds).toBeNull();
    });

    test('read_WhenAFormIsGivenAsParams_ShouldEncodeThemAsTheRequestBody', () => {
        // Arrange
        const text = harOf([
            anEntry({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/token',
                    postData: {
                        mimeType: 'application/x-www-form-urlencoded',
                        params: [
                            {
                                name: 'grant_type',
                                value: 'client_credentials',
                            },
                            {
                                name: 'scope',
                                value: 'api://x/.default',
                            },
                        ],
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const requestBody = read.hasErrors ? null : read.value[0]?.requestBody;
        expect(requestBody).toBe('grant_type=client_credentials&scope=api%3A%2F%2Fx%2F.default');
    });

    test('read_WhenEntriesAreOutOfOrder_ShouldSortThemOldestFirstAndSkipBadUrls', () => {
        // Arrange
        const text = harOf([
            anEntry({
                startedDateTime: '2026-11-12T10:00:05.000Z',
                _resourceType: 'xhr',
            }),
            anEntry({
                request: {
                    url: 'not a url',
                },
            }),
            anEntry({
                startedDateTime: '2026-11-12T10:00:01.000Z',
                _resourceType: '',
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const summaries = read.hasErrors
            ? []
            : read.value.map(detail => `${detail.summary.id}:${detail.summary.resourceType}`);
        expect(summaries).toEqual([
            'har-3:Other',
            'har-1:XHR',
        ]);
    });

    test.each([
        [
            'not json',
            "it isn't valid JSON",
        ],
        [
            '{"log":{}}',
            'it has no log.entries list',
        ],
        [
            '[]',
            'it has no log.entries list',
        ],
    ])('read_WhenTheTextIs(%s)_ShouldSayWhy', (text, expected) => {
        // Arrange
        const file = text;

        // Act
        const read = HarReader.read(file, classifier);

        // Assert
        expect(read).toEqual({
            hasErrors: true,
            error: expected,
        });
    });

    test('read_WhenTheResourceTypeIsAnObjectPrototypeName_ShouldCapitalizeItLikeAnyUnknownType', () => {
        // Arrange
        const text = harOf([
            anEntry({
                _resourceType: 'constructor',
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        expect(read.hasErrors ? null : read.value[0]?.summary.resourceType).toBe('Constructor');
    });
    test('read_WhenPostDataHasTextAndAComment_ShouldShowTheCommentAsTheRequestBodyNote', () => {
        // Arrange
        const comment = 'Decoded by Rewire: Decompressed from gzip (36 bytes → 16 bytes). '
            + 'The request sent 36 bytes.';
        const text = harOf([
            anEntry({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/api/v1/events',
                    postData: {
                        mimeType: 'application/json',
                        text: '{"type":"click"}',
                        comment,
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.requestBody).toBe('{"type":"click"}');
        expect(detail?.requestBodyNote).toBe(comment);
    });

    test('read_WhenPostDataHasOnlyAComment_ShouldShowTheCommentWithoutABody', () => {
        // Arrange
        const text = harOf([
            anEntry({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/api/v1/events',
                    bodySize: 7,
                    postData: {
                        mimeType: 'application/x-protobuf',
                        comment: 'Binary body (7 bytes), not exported.',
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.requestBody).toBeNull();
        expect(detail?.requestBodyNote).toBe('Binary body (7 bytes), not exported.');
        expect(detail?.requestBodyBase64).toBeNull();
    });

    test.each([
        [
            39,
            39,
        ],
        [
            -1,
            null,
        ],
        [
            undefined,
            null,
        ],
    ])('read_WhenTheRequestBodySizeIs(%s)_ShouldKeepAKnownSizeAsTheSentByteSize', (bodySize, expected) => {
        // Arrange
        const text = harOf([
            anEntry({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/api/v1/events',
                    bodySize,
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        expect(read.hasErrors ? undefined : read.value[0]?.requestBodyByteSize).toBe(expected);
    });

    test('read_WhenTheFileIsAnExportedHar_ShouldKeepItsDecodedAndBinaryRequestBodies', () => {
        // Arrange
        const decompressed = aDetail({
            summary: aSummary({
                id: 'decompressed',
                method: 'POST',
                startedAt: '2026-11-12T10:00:00.000Z',
            }),
            requestBody: '{"message":"hello"}',
            requestBodyNote: 'Decompressed from gzip (39 bytes → 19 bytes).',
            requestBodyByteSize: 39,
        });
        const binary = aDetail({
            summary: aSummary({
                id: 'binary',
                method: 'POST',
                startedAt: '2026-11-12T10:00:01.000Z',
            }),
            requestBodyNote: 'Binary body · 7 bytes.',
            requestBodyBase64: 'CgVoZWxsbw==',
            requestBodyByteSize: 7,
        });
        const text = JsonText.stringify(HarBuilder.build(
            /* details: */ [
                decompressed,
                binary,
            ],
            /* options: */ {
                creatorVersion: '1.0.0',
                shouldIncludeSecrets: true,
            },
        ));

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const bodies = read.hasErrors
            ? []
            : read.value.map(detail => ({
                body: detail.requestBody,
                note: detail.requestBodyNote,
                size: detail.requestBodyByteSize,
            }));
        expect(bodies).toEqual([
            {
                body: '{"message":"hello"}',
                note: 'Decoded by Rewire: Decompressed from gzip (39 bytes → 19 bytes). '
                    + 'The request sent 39 bytes.',
                size: 39,
            },
            {
                body: null,
                note: 'Binary body (7 bytes), not exported.',
                size: 7,
            },
        ]);
    });
});
