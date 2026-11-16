import { describe, expect, test, vi } from 'vitest';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { OwnStreams } from './OwnStreams';
import { SseClientView } from './SseClientView';
import { aChannel, aLiveMessage } from '../../../TestData';
import { aPanelHarness, buttonNamed, click } from '../../PanelTestData';

const STREAM_STATE = {
    live: {
        channels: [aChannel({ id: 'sse-1', kind: LIVE_CHANNEL_KIND.EventStream })],
        messages: [
            aLiveMessage({
                id: 'event-1',
                channelId: 'sse-1',
                eventName: 'price',
                eventId: '7',
                data: '{"sku":"CAP"}',
                opcode: null,
            }),
            aLiveMessage({
                id: 'event-2',
                channelId: 'sse-1',
                data: null,
                opcode: null,
            }),
        ],
        postMessages: [],
    },
};

describe('SseClientView', () => {
    test('render_WhenThePageHasAStream_ShouldShowEventsWithAndWithoutData', () => {
        // Arrange
        const harness = aPanelHarness(STREAM_STATE);

        // Act
        const view = new SseClientView(harness.context);

        // Assert
        const rows = [...view.root.querySelectorAll('.live-list .live-item')];
        expect(rows.map(row => row.querySelector('.live-item-title')?.textContent)).toEqual([
            'message',
            'price',
        ]);
        expect(rows[0]?.hasAttribute('data-muted')).toBe(true);
        expect(rows[1]?.querySelector('.live-item-preview')?.textContent).toBe('{"sku":"CAP"}');
        expect(view.root.querySelector('.live-send')).toBeNull();
    });

    test('click_WhenAnEventIsOpened_ShouldShowItsFacts', () => {
        // Arrange
        const view = new SseClientView(aPanelHarness(STREAM_STATE).context);

        // Act
        click(view.root.querySelectorAll('.live-list .live-item-head')[1]);

        // Assert
        expect(view.root.querySelector('.live-facts')?.textContent)
            .toBe('event price · id 7 · retry none · 16 B · 10:00:01.250');
    });

    test('subscribe_WhenAUrlIsGiven_ShouldStartMyStream', () => {
        // Arrange
        const harness = aPanelHarness();
        const streams = new OwnStreams({
            store: harness.store,
            fetch: vi.fn(() => new Promise<Response>(() => undefined)),
            onError: vi.fn(),
            now: () => new Date('2026-11-12T10:00:00.000Z'),
        });
        const view = new SseClientView(harness.context, streams);
        view.root.querySelector<HTMLInputElement>('.live-url')!.value = 'https://api.example.com/events';

        // Act
        click(buttonNamed(view.root, 'Subscribe'));

        // Assert
        expect(view.root.querySelector('.live-channel .tag')?.textContent).toBe('Mine');
        expect(view.root.querySelector("[title='Stop this stream']")).not.toBeNull();
    });
});
