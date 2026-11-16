import { describe, expect, test } from 'vitest';
import { HarBuilder } from './HarBuilder';
import type { HarRequest } from './HarRequest';
import type { TimelineEntryDetail } from '../../Contracts/Timeline/TimelineEntryDetail';
import { aDetail, aSummary } from '../../TestData';

function aPostDetail(): TimelineEntryDetail {
    return aDetail({
        summary: aSummary({
            id: 'post',
            method: 'POST',
            url: 'https://api.example.com/api/v1/orders?page=2&sort=desc',
            statusCode: 201,
            statusText: 'Created',
            mimeType: 'application/json',
            startedAt: '2026-11-12T10:00:02.000Z',
            durationInMilliseconds: 120,
        }),
        requestHeaders: [
            {
                name: 'Content-Type',
                value: 'application/json',
            },
            {
                name: 'Authorization',
                value: 'Bearer secret',
            },
            {
                name: 'Cookie',
                value: 'session=abc; theme=dark',
            },
        ],
        requestBody: '{"item":"café"}',
        responseHeaders: [
            {
                name: 'Set-Cookie',
                value: 'session=xyz; Path=/; Domain=example.com; Expires=Wed, 09 Jun 2027 10:18:14 GMT; Secure; HttpOnly',
            },
            {
                name: 'Location',
                value: '/api/v1/orders/7',
            },
        ],
        responseBody: '{"id":7}',
        responseBodyNote: null,
    });
}

function anEarlierDetail(): TimelineEntryDetail {
    return aDetail({
        summary: aSummary({
            id: 'early',
            startedAt: '2026-11-12T10:00:00.000Z',
            statusCode: null,
            durationInMilliseconds: null,
            errorText: 'net::ERR_CONNECTION_REFUSED',
        }),
        requestHeaders: [],
        requestBody: null,
        responseHeaders: [],
        responseBody: null,
        responseBodyNote: "The body wasn't captured.",
    });
}

const GZIP_NOTE = 'Decompressed from gzip (39 bytes → 19 bytes).';

function aSentBodyDetail(overrides: Partial<TimelineEntryDetail>): TimelineEntryDetail {
    return aDetail({
        summary: aSummary({
            method: 'POST',
        }),
        requestHeaders: [
            {
                name: 'Content-Type',
                value: 'application/json',
            },
            {
                name: 'Content-Encoding',
                value: 'gzip',
            },
        ],
        ...overrides,
    });
}

function requestOf(detail: TimelineEntryDetail): HarRequest {
    const har = HarBuilder.build(
        /* details: */ [detail],
        /* options: */ {
            creatorVersion: '1.0.0',
            shouldIncludeSecrets: true,
        },
    );

    return har.log.entries[0]!.request;
}

describe('HarBuilder', () => {
    test('build_WhenGivenCalls_ShouldWriteAHar12LogSortedByStartTime', () => {
        // Arrange
        const details = [
            aPostDetail(),
            anEarlierDetail(),
        ];

        // Act
        const har = HarBuilder.build(
            /* details: */ details,
            /* options: */ {
                creatorVersion: '1.2.3',
                shouldIncludeSecrets: true,
            },
        );

        // Assert
        expect(har.log.version).toBe('1.2');
        expect(har.log.creator).toEqual({
            name: 'Rewire',
            version: '1.2.3',
        });
        expect(har.log.entries.map(entry => entry.startedDateTime)).toEqual([
            '2026-11-12T10:00:00.000Z',
            '2026-11-12T10:00:02.000Z',
        ]);
    });

    test('build_WhenACallHasABody_ShouldMapRequestAndResponseParts', () => {
        // Arrange
        const details = [aPostDetail()];

        // Act
        const har = HarBuilder.build(
            /* details: */ details,
            /* options: */ {
                creatorVersion: '1.0.0',
                shouldIncludeSecrets: true,
            },
        );

        // Assert
        const entry = har.log.entries[0]!;
        expect(entry.time).toBe(120);
        expect(entry.timings).toEqual({
            send: 0,
            wait: 120,
            receive: 0,
        });
        expect(entry.request.queryString).toEqual([
            {
                name: 'page',
                value: '2',
            },
            {
                name: 'sort',
                value: 'desc',
            },
        ]);
        expect(entry.request.postData).toEqual({
            mimeType: 'application/json',
            text: '{"item":"café"}',
        });
        expect(entry.request.bodySize).toBe(16);
        expect(entry.request.cookies).toEqual([
            {
                name: 'session',
                value: 'abc',
            },
            {
                name: 'theme',
                value: 'dark',
            },
        ]);
        expect(entry.response.status).toBe(201);
        expect(entry.response.redirectURL).toBe('/api/v1/orders/7');
        expect(entry.response.content).toEqual({
            size: 8,
            mimeType: 'application/json',
            text: '{"id":7}',
        });
        expect(entry.response.cookies).toEqual([
            {
                name: 'session',
                value: 'xyz',
                path: '/',
                domain: 'example.com',
                expires: '2027-06-09T10:18:14.000Z',
                httpOnly: true,
                secure: true,
            },
        ]);
    });

    test('build_WhenSecretsAreExcluded_ShouldBlankAuthAndCookieValues', () => {
        // Arrange
        const details = [aPostDetail()];

        // Act
        const har = HarBuilder.build(
            /* details: */ details,
            /* options: */ {
                creatorVersion: '1.0.0',
                shouldIncludeSecrets: false,
            },
        );

        // Assert
        const entry = har.log.entries[0]!;
        expect(entry.request.headers).toEqual([
            {
                name: 'Content-Type',
                value: 'application/json',
            },
            {
                name: 'Authorization',
                value: '',
            },
            {
                name: 'Cookie',
                value: '',
            },
        ]);
        expect(entry.request.cookies.map(cookie => cookie.value)).toEqual([
            '',
            '',
        ]);
        expect(entry.response.headers[0]?.value).toBe('');
        expect(entry.response.cookies[0]?.value).toBe('');
        expect(entry.response.headers[1]?.value).toBe('/api/v1/orders/7');
    });

    test('build_WhenACallFailed_ShouldKeepTheErrorAndTheBodyNote', () => {
        // Arrange
        const details = [anEarlierDetail()];

        // Act
        const har = HarBuilder.build(
            /* details: */ details,
            /* options: */ {
                creatorVersion: '1.0.0',
                shouldIncludeSecrets: false,
            },
        );

        // Assert
        const entry = har.log.entries[0]!;
        expect(entry.response.status).toBe(0);
        expect(entry.time).toBe(0);
        expect(entry._error).toBe('net::ERR_CONNECTION_REFUSED');
        expect(entry.request.postData).toBeUndefined();
        expect(entry.response.content).toEqual({
            size: 0,
            mimeType: 'application/json',
            comment: "The body wasn't captured.",
        });
    });
    test('build_WhenTheSentSizeOfATextBodyIsKnown_ShouldUseItAsTheBodySize', () => {
        // Arrange
        const detail = aSentBodyDetail({
            requestHeaders: [
                {
                    name: 'Content-Type',
                    value: 'text/plain; charset=iso-8859-1',
                },
            ],
            requestBody: 'caf�',
            requestBodyByteSize: 4,
        });

        // Act
        const request = requestOf(detail);

        // Assert
        expect(request.bodySize).toBe(4);
        expect(request.postData).toEqual({
            mimeType: 'text/plain; charset=iso-8859-1',
            text: 'caf�',
        });
    });

    test('build_WhenTheSentSizeOfATextBodyIsUnknown_ShouldCountTheTextInUtf8', () => {
        // Arrange
        const detail = aSentBodyDetail({
            requestBody: '{"item":"café"}',
            requestBodyByteSize: null,
        });

        // Act
        const request = requestOf(detail);

        // Assert
        expect(request.bodySize).toBe(16);
    });

    test('build_WhenTheBodyWasDecompressed_ShouldKeepTheHeadersAndTheSentSizeAndSaySo', () => {
        // Arrange
        const detail = aSentBodyDetail({
            requestBody: '{"message":"hello"}',
            requestBodyNote: GZIP_NOTE,
            requestBodyByteSize: 39,
        });

        // Act
        const request = requestOf(detail);

        // Assert
        expect(request.headers).toEqual([
            {
                name: 'Content-Type',
                value: 'application/json',
            },
            {
                name: 'Content-Encoding',
                value: 'gzip',
            },
        ]);
        expect(request.bodySize).toBe(39);
        expect(request.postData).toEqual({
            mimeType: 'application/json',
            text: '{"message":"hello"}',
            comment: `Decoded by Rewire: ${GZIP_NOTE} The request sent 39 bytes.`,
        });
    });

    test('build_WhenADecompressedBodyHasNoSentSize_ShouldMarkTheBodySizeUnknown', () => {
        // Arrange
        const detail = aSentBodyDetail({
            requestBody: '{"message":"hello"}',
            requestBodyNote: GZIP_NOTE,
            requestBodyByteSize: null,
        });

        // Act
        const request = requestOf(detail);

        // Assert
        expect(request.bodySize).toBe(-1);
        expect(request.postData?.comment).toBe(`Decoded by Rewire: ${GZIP_NOTE}`);
    });

    test('build_WhenTheBodyIsBinary_ShouldGiveItsTypeAndSentSizeWithoutText', () => {
        // Arrange
        const detail = aSentBodyDetail({
            requestHeaders: [
                {
                    name: 'Content-Type',
                    value: 'application/x-protobuf',
                },
            ],
            requestBodyNote: 'Binary body · 1,234 bytes.',
            requestBodyBase64: 'CgVoZWxsbw==',
            requestBodyByteSize: 1234,
        });

        // Act
        const request = requestOf(detail);

        // Assert
        expect(request.bodySize).toBe(1234);
        expect(request.postData).toEqual({
            mimeType: 'application/x-protobuf',
            comment: 'Binary body (1,234 bytes), not exported.',
        });
    });

    test('build_WhenTheSizeOfABinaryBodyIsUnknown_ShouldMarkTheBodySizeUnknown', () => {
        // Arrange
        const detail = aSentBodyDetail({
            requestBodyNote: 'Binary body · 7 bytes.',
            requestBodyBase64: 'CgVoZWxsbw==',
            requestBodyByteSize: null,
        });

        // Act
        const request = requestOf(detail);

        // Assert
        expect(request.bodySize).toBe(-1);
        expect(request.postData).toEqual({
            mimeType: 'application/json',
            comment: 'Binary body, not exported.',
        });
    });

    test('build_WhenTheRequestHasNoBody_ShouldWriteABodySizeOfZero', () => {
        // Arrange
        const detail = aDetail();

        // Act
        const request = requestOf(detail);

        // Assert
        expect(request.bodySize).toBe(0);
        expect(request.postData).toBeUndefined();
    });
});
