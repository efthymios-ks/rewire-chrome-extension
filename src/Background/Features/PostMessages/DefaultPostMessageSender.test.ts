import { describe, expect, test, vi } from 'vitest';
import { DefaultPostMessageSender } from './DefaultPostMessageSender';
import { Result } from '../../../Common/Results/Result';
import { createDebuggerClientMock } from '../../BackgroundTestData';

function setUp(isFound: boolean) {
    const debuggerMock = createDebuggerClientMock();
    const sendToSession = vi.mocked(debuggerMock.client.sendToSessionAsync);
    sendToSession.mockResolvedValue(Result.ok({
        result: {
            type: 'boolean',
            value: isFound,
        },
    }));
    let now = 1000;
    const sender = new DefaultPostMessageSender(debuggerMock.client, () => now);

    return {
        sendToSession,
        sender,
        advance: (milliseconds: number) => {
            now += milliseconds;
        },
    };
}

describe('DefaultPostMessageSender', () => {
    test('sendAsync_WhenTheTargetIsAnIframe_ShouldPostFromTheTopFrameAsAnObject', async () => {
        // Arrange
        const { sendToSession, sender } = setUp(true);

        // Act
        const result = await sender.sendAsync({
            tabId: 7,
            target: 'pay.example.com',
            data: '{ "type": "ping" }',
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        const [call] = sendToSession.mock.calls;
        expect(call?.slice(0, 3)).toEqual([
            7,
            null,
            'Runtime.evaluate',
        ]);
        const expression = (call?.[3] as { expression: string }).expression;
        expect(expression).toContain('"pay.example.com"');
        expect(expression).toContain('postMessage({"type":"ping"}, "*")');
    });

    test('sendAsync_WhenNoIframeMatches_ShouldSaySo', async () => {
        // Arrange
        const { sender } = setUp(false);

        // Act
        const result = await sender.sendAsync({ tabId: 7, target: 'pay.example.com', data: 'hello' });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'No iframe from pay.example.com on the page.',
        });
    });

    test('claim_WhenTheSentMessageArrives_ShouldClaimItOnce', async () => {
        // Arrange
        const { sender } = setUp(true);
        await sender.sendAsync({ tabId: 7, target: 'top', data: 'hello' });

        // Act
        const isFirstClaimed = sender.claim({ tabId: 7, to: 'top', data: 'hello' });
        const isSecondClaimed = sender.claim({ tabId: 7, to: 'top', data: 'hello' });

        // Assert
        expect(isFirstClaimed).toBe(true);
        expect(isSecondClaimed).toBe(false);
    });

    test('claim_WhenTheMessageArrivesTooLate_ShouldNotClaimIt', async () => {
        // Arrange
        const { sender, advance } = setUp(true);
        await sender.sendAsync({ tabId: 7, target: 'top', data: 'hello' });
        advance(5000);

        // Act
        const isClaimed = sender.claim({ tabId: 7, to: 'top', data: 'hello' });

        // Assert
        expect(isClaimed).toBe(false);
    });
});
