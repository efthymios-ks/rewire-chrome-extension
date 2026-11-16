import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeRegexSupportClient } from './ChromeRegexSupportClient';

function stubIsRegexSupported(isRegexSupported: (options: { regex: string }) => Promise<unknown>): void {
    vi.stubGlobal('chrome', {
        declarativeNetRequest: {
            isRegexSupported,
        },
    });
}

describe('ChromeRegexSupportClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('checkAsync_WhenChromeSupportsTheRegex_ShouldSucceed', async () => {
        // Arrange
        const isRegexSupported = vi.fn().mockResolvedValue({
            isSupported: true,
        });
        stubIsRegexSupported(isRegexSupported);

        // Act
        const checked = await new ChromeRegexSupportClient().checkAsync('^https://api\\.example\\.com/');

        // Assert
        expect(checked).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(isRegexSupported).toHaveBeenCalledWith({
            regex: '^https://api\\.example\\.com/',
        });
    });

    test.each([
        [
            'syntaxError',
            "Chrome's RE2 engine rejects the regex syntax.",
        ],
        [
            'memoryLimitExceeded',
            "The regex is too large for Chrome's RE2 engine.",
        ],
        [
            'somethingNew',
            'Chrome rejects the regex.',
        ],
        [
            undefined,
            'Chrome rejects the regex.',
        ],
    ])('checkAsync_WhenChromeRejectsWithReason(%s)_ShouldFailWith(%s)', async (reason, expected) => {
        // Arrange
        stubIsRegexSupported(vi.fn().mockResolvedValue({
            isSupported: false,
            reason,
        }));

        // Act
        const checked = await new ChromeRegexSupportClient().checkAsync('(?<=x)');

        // Assert
        expect(checked).toEqual({
            hasErrors: true,
            error: expected,
        });
    });

    test('checkAsync_WhenTheChromeCallThrows_ShouldFailWithTheErrorMessage', async () => {
        // Arrange
        stubIsRegexSupported(vi.fn().mockRejectedValue(new Error('Extension context invalidated.')));

        // Act
        const checked = await new ChromeRegexSupportClient().checkAsync('a+');

        // Assert
        expect(checked).toEqual({
            hasErrors: true,
            error: 'Extension context invalidated.',
        });
    });
});
