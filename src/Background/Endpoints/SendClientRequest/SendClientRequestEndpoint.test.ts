import { describe, expect, test, vi } from 'vitest';
import { SendClientRequestEndpoint } from './SendClientRequestEndpoint';
import type { ClientRequestSender } from '../../Features/ClientSending/ClientRequestSender';
import { Result } from '../../../Common/Results/Result';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';

describe('SendClientRequestEndpoint', () => {
    test('handleAsync_WhenCalled_ShouldSendTheRequestThroughTheSender', async () => {
        // Arrange
        const answer = Result.ok({
            status: 200,
            statusText: 'OK',
            headers: [],
            body: '{}',
            durationInMilliseconds: 5,
        });
        const sender: ClientRequestSender = {
            sendAsync: vi.fn().mockResolvedValue(answer),
        };
        const request = {
            method: 'GET',
            url: 'https://api.example.com/users',
            headers: [],
            bodyBase64: null,
        };

        // Act
        const result = await new SendClientRequestEndpoint(sender).handleAsync({
            type: PANEL_COMMAND_TYPE.SendClientRequest,
            request,
        });

        // Assert
        expect(result).toBe(answer);
        expect(sender.sendAsync).toHaveBeenCalledWith(request);
    });
});
