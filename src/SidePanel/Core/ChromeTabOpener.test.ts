import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeTabOpener } from './ChromeTabOpener';

describe('ChromeTabOpener', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('openAsync_WhenAUrlIsGiven_ShouldOpenItInANewTab', async () => {
        // Arrange
        const create = vi.fn().mockResolvedValue({});
        vi.stubGlobal('chrome', {
            tabs: {
                create,
            },
        });

        // Act
        const result = await new ChromeTabOpener().openAsync('https://pay.example.com/checkout');

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(create).toHaveBeenCalledWith({
            url: 'https://pay.example.com/checkout',
        });
    });

    test('openAsync_WhenChromeRefuses_ShouldSayWhy', async () => {
        // Arrange
        vi.stubGlobal('chrome', {
            tabs: {
                create: vi.fn().mockRejectedValue(new Error('Not allowed')),
            },
        });

        // Act
        const result = await new ChromeTabOpener().openAsync('chrome://settings');

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "Can't open chrome://settings: Not allowed",
        });
    });
});
