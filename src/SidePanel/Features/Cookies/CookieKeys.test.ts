import { describe, expect, test } from 'vitest';
import { CookieKeys } from './CookieKeys';

function aCookie(overrides: Partial<chrome.cookies.Cookie> = {}): chrome.cookies.Cookie {
    return {
        name: 'embed',
        value: 'chips',
        domain: 'widget.example.net',
        hostOnly: true,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'no_restriction',
        session: true,
        storeId: '0',
        ...overrides,
    };
}

describe('CookieKeys', () => {
    test('of_WhenTwoCookiesDifferOnlyByPartition_ShouldKeyThemApart', () => {
        // Arrange
        const unpartitioned = aCookie();
        const partitioned = aCookie({
            partitionKey: {
                topLevelSite: 'https://shop.example',
            },
        });

        // Act
        const keys = new Set([
            CookieKeys.of(unpartitioned),
            CookieKeys.of(partitioned),
        ]);

        // Assert
        expect(keys.size).toBe(2);
    });

    test('of_WhenOnlyTheValueDiffers_ShouldKeyTheCookiesAlike', () => {
        // Arrange
        const before = aCookie();
        const after = aCookie({
            value: 'rotated',
        });

        // Act
        const key = CookieKeys.of(after);

        // Assert
        expect(key).toBe(CookieKeys.of(before));
    });

    test('partitionOf_WhenTheAncestorFlagIsMissing_ShouldMatchACookieWithoutACrossSiteAncestor', () => {
        // Arrange
        const withoutFlag = {
            topLevelSite: 'https://shop.example',
        };

        // Act
        const key = CookieKeys.partitionOf(withoutFlag);

        // Assert
        expect(key).toBe(CookieKeys.partitionOf({
            topLevelSite: 'https://shop.example',
            hasCrossSiteAncestor: false,
        }));
    });

    test('partitionOf_WhenTheCookieIsUnpartitioned_ShouldBeEmpty', () => {
        // Arrange
        const partitionKey = undefined;

        // Act
        const key = CookieKeys.partitionOf(partitionKey);

        // Assert
        expect(key).toBe('');
    });
});
