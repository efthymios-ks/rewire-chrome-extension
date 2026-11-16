import { describe, expect, test, vi } from 'vitest';
import { ClientBodies } from './ClientBodies';
import type { ClientBody } from './ClientBody';
import { CLIENT_BODY_TYPE } from './ClientBodyType';
import { DefaultHttpClient } from './DefaultHttpClient';

function textBody(text: string): ClientBody {
    return {
        ...ClientBodies.empty(),
        type: CLIENT_BODY_TYPE.Json,
        text,
    };
}

function responseOf(options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string;
    throwOn?: 'fetch' | 'text';
} = {}): Response {
    const headers = new Headers(options.headers ?? {});
    const body = options.body ?? '';
    const response = new Response(body, {
        status: options.status ?? 200,
        statusText: options.statusText ?? 'OK',
        headers,
    });
    if (options.throwOn === 'text') {
        Object.defineProperty(
            /* o: */ response,
            /* p: */ 'text',
            /* attributes: */ {
                value: () => Promise.reject(new Error('bad body')),
            },
        );
    }

    return response;
}

function nowSequence(values: number[]): () => number {
    const queue = [...values];

    return () => queue.shift() ?? 0;
}

describe('DefaultHttpClient', () => {
    test('sendAsync_WhenCalled_ShouldFetchWithTheMethodHeadersAndBody', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf({
            body: '{}',
        }));
        const client = new DefaultHttpClient(
            /* fetcher: */ fetcher,
            /* clock: */ nowSequence([
                100,
                250,
            ]),
        );

        // Act
        const result = await client.sendAsync({
            method: 'POST',
            url: 'https://api.example.com/users',
            headers: [
                {
                    name: 'Accept',
                    value: 'application/json',
                },
                {
                    name: 'X-Trace',
                    value: 'abc',
                },
            ],
            body: textBody('{"name":"Ada"}'),
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(fetcher).toHaveBeenCalledOnce();
        const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.example.com/users');
        expect(init.method).toBe('POST');
        expect(init.body).toBe('{"name":"Ada"}');
        const headers = init.headers as Headers;
        expect(headers.get('Accept')).toBe('application/json');
        expect(headers.get('X-Trace')).toBe('abc');
    });

    test('sendAsync_WhenMethodIsGetOrHead_ShouldOmitTheBody', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf());
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        await client.sendAsync({
            method: 'get',
            url: 'https://api.example.com/users',
            headers: [],
            body: textBody('not sent'),
        });

        // Assert
        expect((fetcher.mock.calls[0]?.[1] as RequestInit).body).toBeUndefined();
    });

    test('sendAsync_WhenBodyIsEmpty_ShouldOmitTheBody', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf());
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        await client.sendAsync({
            method: 'POST',
            url: 'https://api.example.com/users',
            headers: [],
            body: ClientBodies.empty(),
        });

        // Assert
        expect((fetcher.mock.calls[0]?.[1] as RequestInit).body).toBeUndefined();
    });

    test('sendAsync_WhenUrlIsInvalid_ShouldReturnAFailureWithoutCallingFetch', async () => {
        // Arrange
        const fetcher = vi.fn();
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        const result = await client.sendAsync({
            method: 'GET',
            url: 'not a url',
            headers: [],
            body: ClientBodies.empty(),
        });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'URL is not valid.',
        });
        expect(fetcher).not.toHaveBeenCalled();
    });

    test('sendAsync_WhenFetchThrows_ShouldReturnTheErrorMessage', async () => {
        // Arrange
        const fetcher = vi.fn().mockRejectedValue(new Error('network down'));
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        const result = await client.sendAsync({
            method: 'GET',
            url: 'https://api.example.com/users',
            headers: [],
            body: ClientBodies.empty(),
        });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'network down',
        });
    });

    test('sendAsync_WhenReadingTheBodyFails_ShouldReturnAFailure', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf({
            throwOn: 'text',
        }));
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        const result = await client.sendAsync({
            method: 'GET',
            url: 'https://api.example.com/users',
            headers: [],
            body: ClientBodies.empty(),
        });

        // Assert
        expect(result.hasErrors).toBe(true);
        if (result.hasErrors) {
            expect(result.error).toContain('bad body');
        }
    });

    test('sendAsync_WhenSuccessful_ShouldReturnStatusHeadersAndBodyAndTiming', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf({
            status: 201,
            statusText: 'Created',
            headers: {
                'Content-Type': 'application/json',
                'X-Trace': 'abc',
            },
            body: '{"id":1}',
        }));
        const client = new DefaultHttpClient(
            /* fetcher: */ fetcher,
            /* clock: */ nowSequence([
                1000,
                1123,
            ]),
        );

        // Act
        const result = await client.sendAsync({
            method: 'POST',
            url: 'https://api.example.com/users',
            headers: [],
            body: textBody('{}'),
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        if (result.hasErrors) {
            return;
        }

        expect(result.value.status).toBe(201);
        expect(result.value.statusText).toBe('Created');
        expect(result.value.body).toBe('{"id":1}');
        expect(result.value.durationInMilliseconds).toBe(123);
        expect(result.value.headers.map(header => [
            header.name.toLowerCase(),
            header.value,
        ])).toEqual(expect.arrayContaining([
            [
                'content-type',
                'application/json',
            ],
            [
                'x-trace',
                'abc',
            ],
        ]));
    });

    test('sendAsync_WhenHeaderNameIsBlank_ShouldSkipIt', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf());
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        await client.sendAsync({
            method: 'GET',
            url: 'https://api.example.com/',
            headers: [
                {
                    name: ' ',
                    value: 'value',
                },
                {
                    name: 'Accept',
                    value: 'application/json',
                },
            ],
            body: ClientBodies.empty(),
        });

        // Assert
        const headers = (fetcher.mock.calls[0]?.[1] as RequestInit).headers as Headers;
        expect(headers.get('Accept')).toBe('application/json');
        expect([...headers.keys()].map(name => name.toLowerCase())).toEqual(['accept']);
    });

    test('sendAsync_WhenNoContentTypeIsSet_ShouldSendTheOneOfTheBodyType', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf());
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        await client.sendAsync({
            method: 'POST',
            url: 'https://api.example.com/users',
            headers: [],
            body: textBody('{}'),
        });

        // Assert
        const headers = (fetcher.mock.calls[0]?.[1] as RequestInit).headers as Headers;
        expect(headers.get('Content-Type')).toBe('application/json');
    });

    test('sendAsync_WhenTheMethodIsGet_ShouldSendNeitherABodyNorItsContentType', async () => {
        // Arrange
        const fetcher = vi.fn().mockResolvedValue(responseOf());
        const client = new DefaultHttpClient(fetcher, () => 0);

        // Act
        await client.sendAsync({
            method: 'GET',
            url: 'https://api.example.com/users',
            headers: [],
            body: textBody('{}'),
        });

        // Assert
        const init = fetcher.mock.calls[0]?.[1] as RequestInit;
        expect(init.body).toBeUndefined();
        expect((init.headers as Headers).has('Content-Type')).toBe(false);
    });
});
