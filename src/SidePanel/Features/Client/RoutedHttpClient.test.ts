import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { ClientBodies } from './ClientBodies';
import { CLIENT_BODY_TYPE } from './ClientBodyType';
import type { ClientRequest } from './ClientRequest';
import type { HttpClient } from './HttpClient';
import { RoutedHttpClient } from './RoutedHttpClient';

function aClient(): HttpClient {
    return {
        sendAsync: vi.fn().mockResolvedValue(Result.done()),
    };
}

function aRequest(changes: Partial<ClientRequest> = {}): ClientRequest {
    return {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        body: ClientBodies.empty(),
        ...changes,
    };
}

describe('RoutedHttpClient', () => {
    test('sendAsync_WhenTheBrowserCanSendIt_ShouldUseFetch', async () => {
        // Arrange
        const browser = aClient();
        const viaDebugger = aClient();
        const request = aRequest();

        // Act
        await new RoutedHttpClient(browser, viaDebugger).sendAsync(request);

        // Assert
        expect(browser.sendAsync).toHaveBeenCalledWith(request);
        expect(viaDebugger.sendAsync).not.toHaveBeenCalled();
    });

    test('sendAsync_WhenAGetCarriesABody_ShouldGoThroughTheDebugger', async () => {
        // Arrange
        const browser = aClient();
        const viaDebugger = aClient();
        const request = aRequest({
            body: {
                ...ClientBodies.empty(),
                type: CLIENT_BODY_TYPE.Json,
                text: '{}',
            },
        });

        // Act
        await new RoutedHttpClient(browser, viaDebugger).sendAsync(request);

        // Assert
        expect(viaDebugger.sendAsync).toHaveBeenCalledWith(request);
        expect(browser.sendAsync).not.toHaveBeenCalled();
    });
});
