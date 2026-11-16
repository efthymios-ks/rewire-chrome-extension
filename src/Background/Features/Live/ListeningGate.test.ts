import { describe, expect, test, vi } from 'vitest';
import { DefaultLiveListeningRegistry } from './DefaultLiveListeningRegistry';
import { ListeningGate } from './ListeningGate';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';

function aGate(isListening: boolean) {
    const registry = new DefaultLiveListeningRegistry();
    registry.set(7, {
        ...NO_LIVE_LISTENING,
        webSockets: isListening,
    });
    const inner = {
        event: 'Network.webSocketCreated' as const,
        handleAsync: vi.fn().mockResolvedValue(undefined),
    };

    return {
        inner,
        gate: new ListeningGate({ inner, registry, kind: 'webSockets' }),
    };
}

const PARAMS = {
    requestId: 'ws-1',
    url: 'wss://live.example.com/socket',
};

describe('ListeningGate', () => {
    test('handleAsync_WhenTheTabListens_ShouldPassTheEventOn', async () => {
        // Arrange
        const { inner, gate } = aGate(true);

        // Act
        await gate.handleAsync(
            /* tabId: */ 7,
            /* params: */ PARAMS,
            /* sessionId: */ 'session-a',
        );

        // Assert
        expect(gate.event).toBe('Network.webSocketCreated');
        expect(inner.handleAsync).toHaveBeenCalledWith(
            /* tabId: */ 7,
            /* params: */ PARAMS,
            /* sessionId: */ 'session-a',
        );
    });

    test('handleAsync_WhenTheTabIsNotListening_ShouldDropTheEvent', async () => {
        // Arrange
        const { inner, gate } = aGate(false);

        // Act
        await gate.handleAsync(
            /* tabId: */ 7,
            /* params: */ PARAMS,
            /* sessionId: */ null,
        );

        // Assert
        expect(inner.handleAsync).not.toHaveBeenCalled();
    });
});
