import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeClipboardClient } from './ChromeClipboardClient';

function stubClipboard(writeText: (text: string) => Promise<void>): void {
    vi.stubGlobal('navigator', {
        clipboard: {
            writeText,
        },
    });
}

describe('ChromeClipboardClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('copyAsync_WhenTheClipboardAccepts_ShouldWriteTheText', async () => {
        // Arrange
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard(writeText);

        // Act
        const result = await new ChromeClipboardClient().copyAsync('curl https://api.example.com');

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(writeText).toHaveBeenCalledWith('curl https://api.example.com');
    });

    test('copyAsync_WhenTheClipboardRefuses_ShouldSayWhy', async () => {
        // Arrange
        stubClipboard(vi.fn().mockRejectedValue(new Error('Document is not focused.')));

        // Act
        const result = await new ChromeClipboardClient().copyAsync('token');

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Copying failed: Document is not focused.',
        });
    });
});
