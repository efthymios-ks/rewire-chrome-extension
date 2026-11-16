import { describe, expect, test } from 'vitest';
import { RemoveLiveChannelsEndpoint } from './RemoveLiveChannelsEndpoint';
import { DefaultLiveStore } from '../../Features/Live/DefaultLiveStore';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { aChannel, aLiveMessage } from '../../../TestData';

describe('RemoveLiveChannelsEndpoint', () => {
    test('handleAsync_WhenClosedSocketsAreRemoved_ShouldDropThemAndTheirFrames', async () => {
        // Arrange
        const store = new DefaultLiveStore();
        store.upsertChannel(aChannel({ id: 'ws-1' }));
        store.upsertChannel(aChannel({ id: 'ws-2' }));
        const { id: _first, ...firstFrame } = aLiveMessage({
            channelId: 'ws-1',
        });
        const { id: _second, ...secondFrame } = aLiveMessage({
            channelId: 'ws-2',
        });
        store.addMessage(7, firstFrame);
        store.addMessage(7, secondFrame);
        const endpoint = new RemoveLiveChannelsEndpoint(store);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.RemoveLiveChannels,
            tabId: 7,
            channelIds: ['ws-1'],
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        const snapshot = store.snapshot(7);
        expect(snapshot.channels.map(channel => channel.id)).toEqual(['ws-2']);
        expect(snapshot.messages.map(message => message.channelId)).toEqual(['ws-2']);
    });
});
