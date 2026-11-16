import { describe, expect, test } from 'vitest';
import { KeepAliveEndpoint } from './KeepAliveEndpoint';

describe('KeepAliveEndpoint', () => {
    test('handleAsync_WhenThePanelPings_ShouldSucceed', async () => {
        // Arrange
        const endpoint = new KeepAliveEndpoint();

        // Act
        const result = await endpoint.handleAsync();

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: undefined,
        });
    });
});
