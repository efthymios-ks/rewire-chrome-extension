import { describe, expect, test, vi } from 'vitest';
import { SetLiveListeningEndpoint } from './SetLiveListeningEndpoint';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';

describe('SetLiveListeningEndpoint', () => {
    test('handleAsync_WhenListeningChanges_ShouldPassItToTheService', async () => {
        // Arrange
        const service = {
            setAsync: vi.fn().mockResolvedValue(undefined),
            forget: vi.fn(),
        };
        const endpoint = new SetLiveListeningEndpoint(service);
        const listening = {
            ...NO_LIVE_LISTENING,
            webSockets: true,
        };

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.SetLiveListening,
            tabId: 7,
            listening,
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(service.setAsync).toHaveBeenCalledWith(7, listening);
    });
});
