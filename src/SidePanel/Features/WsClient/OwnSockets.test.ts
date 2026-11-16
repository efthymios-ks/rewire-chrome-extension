import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import { OwnSockets } from './OwnSockets';
import { FakeSocket } from './FakeSocket';

function setUp() {
    const store = new Store<PanelState>(PanelStateFactory.initial());
    const socket = new FakeSocket();
    const headerRules = {
        startAsync: vi.fn().mockResolvedValue(undefined),
        addAsync: vi.fn().mockResolvedValue(Result.ok(1_000_000)),
        removeAsync: vi.fn().mockResolvedValue(undefined),
    };
    const createSocket = vi.fn(() => socket as unknown as WebSocket);
    const sockets = new OwnSockets({
        store,
        headerRules,
        createSocket,
        now: () => new Date('2026-11-12T10:00:00.000Z'),
    });

    return {
        store,
        socket,
        headerRules,
        createSocket,
        sockets,
    };
}

describe('OwnSockets', () => {
    test('connectAsync_WhenHeadersAreGiven_ShouldSetThemForTheHandshakeAndAddMySocket', async () => {
        // Arrange
        const { store, headerRules, sockets } = setUp();
        const headers = [
            {
                name: 'Authorization',
                value: 'Bearer abc',
            },
        ];

        // Act
        const connected = await sockets.connectAsync('wss://live.example.com/socket', headers);

        // Assert
        expect(connected).toEqual({
            hasErrors: false,
            value: 'mine-ws-1',
        });
        expect(headerRules.addAsync).toHaveBeenCalledWith('wss://live.example.com/socket', headers);
        expect(store.getState().live.channels[0]).toMatchObject({
            id: 'mine-ws-1',
            isMine: true,
            isOpen: true,
        });
    });

    test('connectAsync_WhenNoHeadersAreGiven_ShouldStillWaitForStaleRulesToBeCleared', async () => {
        // Arrange
        const { headerRules, createSocket, sockets } = setUp();
        let finishStart: () => void = () => {};
        headerRules.startAsync.mockReturnValue(new Promise<void>(resolve => {
            finishStart = resolve;
        }));

        // Act
        const connecting = sockets.connectAsync('wss://live.example.com/socket', []);
        await Promise.resolve();
        const connectedEarly = createSocket.mock.calls.length > 0;
        finishStart();
        await connecting;

        // Assert
        expect(connectedEarly).toBe(false);
        expect(createSocket).toHaveBeenCalledOnce();
        expect(headerRules.addAsync).not.toHaveBeenCalled();
    });

    test('send_WhenMySocketIsOpen_ShouldSendAndRecordBothDirections', async () => {
        // Arrange
        const { store, socket, sockets } = setUp();
        await sockets.connectAsync('wss://live.example.com/socket', []);

        // Act
        const sent = sockets.send('mine-ws-1', 'ping');
        socket.receive('pong');
        socket.receive(new Uint8Array([
            0,
            1,
            2,
        ]).buffer);

        // Assert
        expect(sent.hasErrors).toBe(false);
        expect(socket.sent).toEqual(['ping']);
        expect(store.getState().live.messages.map(message => [
            message.direction,
            message.data,
            message.opcode,
        ])).toEqual([
            [
                LIVE_MESSAGE_DIRECTION.Sent,
                'ping',
                1,
            ],
            [
                LIVE_MESSAGE_DIRECTION.Received,
                'pong',
                1,
            ],
            [
                LIVE_MESSAGE_DIRECTION.Received,
                'AAEC',
                2,
            ],
        ]);
    });

    test('close_WhenMySocketCloses_ShouldMarkItClosedAndDropTheHeaderRule', async () => {
        // Arrange
        const { store, headerRules, sockets } = setUp();
        await sockets.connectAsync(
            /* url: */ 'wss://live.example.com/socket',
            /* headers: */ [
                {
                    name: 'X-Trace',
                    value: '1',
                },
            ],
        );

        // Act
        sockets.close('mine-ws-1');

        // Assert
        expect(store.getState().live.channels[0]?.isOpen).toBe(false);
        expect(headerRules.removeAsync).toHaveBeenCalledWith(1_000_000);
        expect(sockets.send('mine-ws-1', 'late')).toEqual({
            hasErrors: true,
            error: "This socket isn't open.",
        });
    });
});
