import { describe, expect, test, vi } from 'vitest';
import { SendPostMessageEndpoint } from './SendPostMessageEndpoint';
import { Result } from '../../../Common/Results/Result';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';

describe('SendPostMessageEndpoint', () => {
    test('handleAsync_WhenAMessageIsSent_ShouldPassItToTheSender', async () => {
        // Arrange
        const sender = {
            sendAsync: vi.fn().mockResolvedValue(Result.done()),
            claim: vi.fn(),
        };
        const endpoint = new SendPostMessageEndpoint(sender);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.SendPostMessage,
            tabId: 7,
            target: 'pay.example.com',
            data: 'hello',
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(sender.sendAsync).toHaveBeenCalledWith({
            tabId: 7,
            target: 'pay.example.com',
            data: 'hello',
        });
    });
});
