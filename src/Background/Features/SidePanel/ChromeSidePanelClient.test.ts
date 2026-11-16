import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeSidePanelClient } from './ChromeSidePanelClient';

function stubChrome() {
    const setPanelBehavior = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
        sidePanel: {
            setPanelBehavior,
        },
    });

    return setPanelBehavior;
}

describe('ChromeSidePanelClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('openOnToolbarClickAsync_WhenChromeAccepts_ShouldOpenThePanelFromTheToolbar', async () => {
        // Arrange
        const setPanelBehavior = stubChrome();
        const client = new ChromeSidePanelClient();

        // Act
        const result = await client.openOnToolbarClickAsync();

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(setPanelBehavior).toHaveBeenCalledWith({
            openPanelOnActionClick: true,
        });
    });

    test('openOnToolbarClickAsync_WhenChromeFails_ShouldFailWithTheReason', async () => {
        // Arrange
        const setPanelBehavior = stubChrome();
        setPanelBehavior.mockRejectedValue(new Error('Side panel API unavailable'));
        const client = new ChromeSidePanelClient();

        // Act
        const result = await client.openOnToolbarClickAsync();

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Configuring the side panel failed: Side panel API unavailable',
        });
    });
});
