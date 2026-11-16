import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';
import { OwnSockets } from './OwnSockets';
import { WsClientView } from './WsClientView';
import { aChannel, aLiveMessage, aProfile, aSettings, nextTaskAsync } from '../../../TestData';
import { aPanelHarness, buttonNamed, click, typeInto } from '../../PanelTestData';
import { FakeSocket } from './FakeSocket';

function aView(state: Parameters<typeof aPanelHarness>[0] = {}) {
    const harness = aPanelHarness(state);
    const socket = new FakeSocket();
    const createSocket = vi.fn(() => socket as unknown as WebSocket);
    const sockets = new OwnSockets({
        store: harness.store,
        headerRules: {
            startAsync: vi.fn().mockResolvedValue(undefined),
            addAsync: vi.fn().mockResolvedValue(Result.ok(1)),
            removeAsync: vi.fn().mockResolvedValue(undefined),
        },
        createSocket,
        now: () => new Date('2026-11-12T10:00:00.000Z'),
    });
    const view = new WsClientView(harness.context, sockets);

    return {
        harness,
        socket,
        createSocket,
        view,
    };
}

describe('WsClientView', () => {
    test('render_WhenThePageHasASocket_ShouldListItAndItsFramesWithoutASendBar', () => {
        // Arrange
        const state = {
            live: {
                channels: [aChannel({ id: 'ws-1' })],
                messages: [
                    aLiveMessage({
                        id: 'frame-1',
                        direction: LIVE_MESSAGE_DIRECTION.Sent,
                        data: 'hello',
                    }),
                    aLiveMessage({
                        id: 'frame-2',
                        data: '',
                        opcode: 9,
                    }),
                ],
                postMessages: [],
            },
        };

        // Act
        const { view } = aView(state);

        // Assert
        expect(view.root.querySelector('.live-channel .tag')?.textContent).toBe('Page');
        const rows = [...view.root.querySelectorAll('.live-list .live-item')];
        expect(rows.map(row => row.querySelector('.live-item-title')?.textContent)).toEqual([
            '↓ping',
            '↑hello',
        ]);
        expect(rows[0]?.hasAttribute('data-muted')).toBe(true);
        expect(view.root.querySelector<HTMLElement>('.ws-send')?.hidden).toBe(true);
    });

    test('connectAsync_WhenAUrlWithAVariableIsGiven_ShouldOpenMySocketAndOfferTheSendBar', async () => {
        // Arrange
        const { createSocket, socket, view } = aView({
            settings: aSettings({
                profiles: [
                    aProfile({
                        variables: [
                            {
                                name: 'host',
                                value: 'live.example.com',
                            },
                        ],
                    }),
                ],
            }),
        });
        view.root.querySelector<HTMLInputElement>('.live-url')!.value = 'wss://{{host}}/socket';

        // Act
        click(buttonNamed(view.root, 'Connect'));
        await nextTaskAsync();
        const input = view.root.querySelector<HTMLInputElement>('.ws-send input')!;
        input.value = 'ping';
        click(buttonNamed(
            /* root: */ view.root.querySelector('.ws-send')!,
            /* text: */ 'Send',
        ));

        // Assert
        expect(createSocket).toHaveBeenCalledWith('wss://live.example.com/socket');
        expect(view.root.querySelector<HTMLElement>('.ws-send')?.hidden).toBe(false);
        expect(socket.sent).toEqual(['ping']);
    });

    test('filter_WhenTextIsTyped_ShouldKeepOnlyMatchingFrames', () => {
        // Arrange
        const { view } = aView({
            live: {
                channels: [aChannel({ id: 'ws-1', kind: LIVE_CHANNEL_KIND.WebSocket })],
                messages: [
                    aLiveMessage({
                        id: 'frame-1',
                        data: '{"type":"price"}',
                    }),
                    aLiveMessage({
                        id: 'frame-2',
                        data: '{"type":"chat"}',
                    }),
                ],
                postMessages: [],
            },
        });
        const filter = view.root.querySelector<HTMLInputElement>('.live-filter')!;

        // Act
        typeInto(filter, 'CHAT');

        // Assert
        expect(view.root.querySelectorAll('.live-list .live-item')).toHaveLength(1);
    });

    test('clearClosed_WhenClicked_ShouldRemoveClosedSocketsAndKeepOpenOnes', async () => {
        // Arrange
        const { harness, view } = aView({
            live: {
                channels: [
                    aChannel({
                        id: 'ws-closed',
                        kind: LIVE_CHANNEL_KIND.WebSocket,
                        isOpen: false,
                        overrides: {
                            isMine: true,
                        },
                    }),
                    aChannel({ id: 'ws-open' }),
                ],
                messages: [],
                postMessages: [],
            },
        });

        // Act
        click(buttonNamed(view.root, 'Clear closed'));
        await nextTaskAsync();

        // Assert
        expect(harness.store.getState().live.channels.map(channel => channel.id)).toEqual(['ws-open']);
        expect(buttonNamed(view.root, 'Clear closed').hidden).toBe(true);
    });

    test('send_WhenTheSelectedSocketWasClearedAway_ShouldSendOnTheSocketShown', async () => {
        // Arrange
        const harness = aPanelHarness();
        const kept = new FakeSocket();
        const cleared = new FakeSocket();
        const sockets = new OwnSockets({
            store: harness.store,
            headerRules: {
                startAsync: vi.fn().mockResolvedValue(undefined),
                addAsync: vi.fn().mockResolvedValue(Result.ok(1)),
                removeAsync: vi.fn().mockResolvedValue(undefined),
            },
            createSocket: vi
                .fn()
                .mockReturnValueOnce(kept as unknown as WebSocket)
                .mockReturnValueOnce(cleared as unknown as WebSocket),
            now: () => new Date('2026-11-12T10:00:00.000Z'),
        });
        const view = new WsClientView(harness.context, sockets);
        view.root.querySelector<HTMLInputElement>('.live-url')!.value = 'wss://live.example.com/socket';
        click(buttonNamed(view.root, 'Connect'));
        await nextTaskAsync();
        click(buttonNamed(view.root, 'Connect'));
        await nextTaskAsync();
        cleared.close();
        click(buttonNamed(view.root, 'Clear closed'));
        await nextTaskAsync();

        // Act
        view.root.querySelector<HTMLInputElement>('.ws-send input')!.value = 'ping';
        click(buttonNamed(
            /* root: */ view.root.querySelector('.ws-send')!,
            /* text: */ 'Send',
        ));

        // Assert
        expect(kept.sent).toEqual(['ping']);
        expect(harness.noticeText()).toBe('');
    });

    test('constructor_WhenBuilt_ShouldOfferThePageSocketsSwitchOff', () => {
        // Arrange
        const state = {};

        // Act
        const { view } = aView(state);

        // Assert
        const toggle = view.root.querySelector('.listening-toggle');
        expect(toggle?.textContent).toBe('Listen to page sockets');
        expect(toggle?.querySelector<HTMLInputElement>('input')?.checked).toBe(false);
    });
});
