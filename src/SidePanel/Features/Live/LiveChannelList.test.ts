import { describe, expect, test, vi } from 'vitest';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { LiveChannelList } from './LiveChannelList';
import { aChannel } from '../../../TestData';
import { click } from '../../PanelTestData';

function aList() {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const onRemove = vi.fn();
    const list = new LiveChannelList({
        emptyText: 'No sockets yet.',
        closeTitle: 'Close this socket',
        removeTitle: 'Remove this socket',
        onSelect,
        onClose,
        onRemove,
    });

    return {
        list,
        onSelect,
        onClose,
        onRemove,
    };
}

describe('LiveChannelList', () => {
    test('update_WhenChannelsExist_ShouldShowStateOwnerAddressAndCount', () => {
        // Arrange
        const { list } = aList();

        // Act
        list.update(
            /* rows: */ [
                {
                    channel: aChannel({ id: 'ws-1', kind: LIVE_CHANNEL_KIND.WebSocket, isOpen: false }),
                    count: 3,
                },
            ],
            /* selectedId: */ null,
        );

        // Assert
        const row = list.root.querySelector('.live-channel')!;
        expect(row.querySelector('.live-dot')?.getAttribute('data-state') === 'open').toBe(false);
        expect(row.querySelector('.tag')?.textContent).toBe('Page');
        expect(row.querySelector('.live-channel-address')?.textContent).toBe('live.example.com/socket');
        expect(row.querySelector('.live-channel-count')?.textContent).toBe('3');
        expect(row.querySelector("[title='Close this socket']")).toBeNull();
        expect(row.querySelector("[title='Remove this socket']")).not.toBeNull();
    });

    test('update_WhenMySocketIsOpen_ShouldOfferToCloseIt', () => {
        // Arrange
        const { list, onClose, onSelect } = aList();
        list.update(
            /* rows: */ [
                {
                    channel: aChannel({
                        id: 'mine-ws-1',
                        kind: LIVE_CHANNEL_KIND.WebSocket,
                        isOpen: true,
                        overrides: {
                            isMine: true,
                        },
                    }),
                    count: 0,
                },
            ],
            /* selectedId: */ 'mine-ws-1',
        );

        // Act
        click(list.root.querySelector("[title='Close this socket']"));
        click(list.root.querySelector('.live-channel-pick'));

        // Assert
        expect(onClose).toHaveBeenCalledWith('mine-ws-1');
        expect(onSelect).toHaveBeenCalledWith('mine-ws-1');
        expect(list.root.querySelector('.live-channel')?.hasAttribute('data-selected')).toBe(true);
    });

    test('update_WhenAPageSocketIsOpen_ShouldOfferNoButton', () => {
        // Arrange
        const { list } = aList();

        // Act
        list.update(
            /* rows: */ [
                {
                    channel: aChannel({ id: 'ws-1' }),
                    count: 0,
                },
            ],
            /* selectedId: */ null,
        );

        // Assert
        expect(list.root.querySelector("[title='Close this socket']")).toBeNull();
        expect(list.root.querySelector("[title='Remove this socket']")).toBeNull();
    });

    test('remove_WhenAClosedSocketsButtonIsClicked_ShouldAskToRemoveIt', () => {
        // Arrange
        const { list, onRemove } = aList();
        list.update(
            /* rows: */ [
                {
                    channel: aChannel({ id: 'ws-1', kind: LIVE_CHANNEL_KIND.WebSocket, isOpen: false }),
                    count: 2,
                },
            ],
            /* selectedId: */ null,
        );

        // Act
        click(list.root.querySelector("[title='Remove this socket']"));

        // Assert
        expect(onRemove).toHaveBeenCalledWith('ws-1');
    });
});
