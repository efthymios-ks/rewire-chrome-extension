import { describe, expect, test } from 'vitest';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';
import { OWN_CHANNELS } from '../../../Contracts/Live/OwnChannels';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import { OwnChannelRegistry } from './OwnChannelRegistry';

const NOW = '2026-11-12T10:00:00.000Z';
const URL = 'wss://live.example.com/socket';

function setUp() {
    const store = new Store<PanelState>(PanelStateFactory.initial());
    const registry = new OwnChannelRegistry<string>({
        store,
        kind: LIVE_CHANNEL_KIND.WebSocket,
        idPrefix: 'mine-test-',
        now: () => new Date(NOW),
    });

    return {
        store,
        registry,
    };
}

function aMessage(channelId: string) {
    return {
        channelId,
        direction: LIVE_MESSAGE_DIRECTION.Received,
        data: 'hello',
        size: 5,
        opcode: 1,
        eventName: null,
        eventId: null,
        retry: null,
    };
}

describe('OwnChannelRegistry', () => {
    test('open_WhenAUrlIsGiven_ShouldAddAnOpenChannelOfMineAndKeepItsHandle', () => {
        // Arrange
        const { store, registry } = setUp();

        // Act
        const channel = registry.open(URL, 'handle-1');

        // Assert
        expect(channel).toEqual({
            id: 'mine-test-1',
            tabId: OWN_CHANNELS.TabId,
            kind: LIVE_CHANNEL_KIND.WebSocket,
            url: URL,
            isOpen: true,
            isMine: true,
            openedAt: NOW,
        });
        expect(store.getState().live.channels).toEqual([channel]);
        expect(registry.handleOf(channel.id)).toBe('handle-1');
    });

    test('close_WhenTheChannelIsOpen_ShouldMarkItClosedAndReturnItsHandle', () => {
        // Arrange
        const { store, registry } = setUp();
        const channel = registry.open(URL, 'handle-1');

        // Act
        const handle = registry.close(channel);

        // Assert
        expect(handle).toBe('handle-1');
        expect(registry.handleOf(channel.id)).toBeUndefined();
        expect(store.getState().live.channels[0]?.isOpen).toBe(false);
    });

    test('close_WhenTheChannelWasClosedBefore_ShouldReturnNoHandle', () => {
        // Arrange
        const { registry } = setUp();
        const channel = registry.open(URL, 'handle-1');
        registry.close(channel);

        // Act
        const handle = registry.close(channel);

        // Assert
        expect(handle).toBeUndefined();
    });

    test('addMessage_WhenChannelsAndMessagesAreAdded_ShouldNumberThemFromOneSequence', () => {
        // Arrange
        const { store, registry } = setUp();
        const channel = registry.open(URL, 'handle-1');

        // Act
        registry.addMessage(aMessage(channel.id));
        const second = registry.open(URL, 'handle-2');
        registry.addMessage(aMessage(second.id));

        // Assert
        expect(second.id).toBe('mine-test-3');
        expect(store.getState().live.messages.map(message => message.id)).toEqual([
            'mine-test-1-2',
            'mine-test-3-4',
        ]);
        expect(store.getState().live.messages[0]).toMatchObject({
            channelId: channel.id,
            at: NOW,
            data: 'hello',
        });
    });
});
