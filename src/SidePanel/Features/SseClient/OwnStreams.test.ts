import { describe, expect, test, vi } from 'vitest';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import { OwnStreams } from './OwnStreams';
import { nextTaskAsync } from '../../../TestData';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        start(controller) {
            chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
            controller.close();
        },
    });
}

function setUp(response: Response) {
    const store = new Store<PanelState>(PanelStateFactory.initial());
    const fetch = vi.fn().mockResolvedValue(response);
    const onError = vi.fn();
    const streams = new OwnStreams({
        store,
        fetch,
        onError,
        now: () => new Date('2026-11-12T10:00:00.000Z'),
    });

    return {
        store,
        fetch,
        onError,
        streams,
    };
}

describe('OwnStreams', () => {
    test('subscribe_WhenTheStreamSendsEvents_ShouldAddThemAndCloseAtTheEnd', async () => {
        // Arrange
        const { store, fetch, streams } = setUp(new Response(streamOf([
            'event: price\ndata: 1',
            '0\n\n: ping\n\nevent: done\n\n',
        ])));

        // Act
        const channelId = streams.subscribe(
            /* url: */ 'https://api.example.com/events',
            /* headers: */ [
                {
                    name: 'Authorization',
                    value: 'Bearer abc',
                },
            ],
        );
        await nextTaskAsync();

        // Assert
        const [, init] = fetch.mock.calls[0] as [string, RequestInit];
        expect(new Headers(init.headers).get('Authorization')).toBe('Bearer abc');
        expect(new Headers(init.headers).get('Accept')).toBe('text/event-stream');
        expect(init.credentials).toBe('include');
        const { live } = store.getState();
        expect(live.messages.map(message => `${message.eventName}:${message.data}`)).toEqual([
            'price:10',
            'done:null',
        ]);
        expect(live.channels.find(channel => channel.id === channelId)?.isOpen).toBe(false);
    });

    test('subscribe_WhenTheServerRefuses_ShouldSayItsStatus', async () => {
        // Arrange
        const { onError, streams } = setUp(new Response('nope', {
            status: 401,
            statusText: 'Unauthorized',
        }));

        // Act
        streams.subscribe('https://api.example.com/events', []);
        await nextTaskAsync();

        // Assert
        expect(onError).toHaveBeenCalledWith('https://api.example.com/events answered 401 Unauthorized.');
    });
});
