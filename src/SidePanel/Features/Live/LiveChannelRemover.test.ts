import { describe, expect, test } from 'vitest';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { LiveChannelRemover } from './LiveChannelRemover';
import { aChannel } from '../../../TestData';
import { aPanelHarness, sentOf } from '../../PanelTestData';

function aHarness() {
    return aPanelHarness({
        inspectedTab: {
            tabId: 7,
            url: 'https://app.example.com/',
            title: 'App',
        },
        live: {
            channels: [
                aChannel({ id: 'page-closed', kind: LIVE_CHANNEL_KIND.WebSocket, isOpen: false }),
                aChannel({
                    id: 'mine-closed',
                    kind: LIVE_CHANNEL_KIND.WebSocket,
                    isOpen: false,
                    overrides: {
                        isMine: true,
                    },
                }),
                aChannel({ id: 'page-open' }),
            ],
            messages: [],
            postMessages: [],
        },
    });
}

describe('LiveChannelRemover', () => {
    test('removeAsync_WhenClosedChannelsAreRemoved_ShouldDropThemAndTellTheWorkerAboutPageOnes', async () => {
        // Arrange
        const harness = aHarness();
        const remover = new LiveChannelRemover(harness.context);

        // Act
        await remover.removeAsync([
            'page-closed',
            'mine-closed',
            'page-open',
        ]);

        // Assert
        expect(harness.store.getState().live.channels.map(channel => channel.id)).toEqual(['page-open']);
        expect(sentOf(harness, PANEL_COMMAND_TYPE.RemoveLiveChannels)).toEqual([
            {
                type: PANEL_COMMAND_TYPE.RemoveLiveChannels,
                tabId: 7,
                channelIds: ['page-closed'],
            },
        ]);
    });

    test('removeAsync_WhenOnlyMyChannelsGo_ShouldNotCallTheWorker', async () => {
        // Arrange
        const harness = aHarness();
        const remover = new LiveChannelRemover(harness.context);

        // Act
        await remover.removeAsync(['mine-closed']);

        // Assert
        expect(sentOf(harness, PANEL_COMMAND_TYPE.RemoveLiveChannels)).toEqual([]);
    });
});
