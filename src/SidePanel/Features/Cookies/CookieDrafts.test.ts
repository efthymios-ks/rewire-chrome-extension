import { describe, expect, test } from 'vitest';
import type { CookieDraft } from './CookieDraft';
import { CookieDrafts } from './CookieDrafts';

const PARTITION_KEY = Object.freeze({
    topLevelSite: 'https://shop.example',
});

function aCookie(overrides: Partial<chrome.cookies.Cookie> = {}): chrome.cookies.Cookie {
    return {
        name: 'session',
        value: 'abc',
        domain: '.example.com',
        path: '/',
        hostOnly: false,
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        session: true,
        storeId: '0',
        ...overrides,
    };
}

describe('CookieDrafts', () => {
    test.each([
        [
            '.example.com',
            '/',
            true,
            'https://example.com/',
        ],
        [
            'api.example.com',
            '/v1',
            false,
            'http://api.example.com/v1',
        ],
        [
            'api.example.com',
            '',
            true,
            'https://api.example.com/',
        ],
    ])("urlOf_WhenDomainAndPathAre(%s, '%s')_ShouldBuildTheCookieUrl", (
        domain,
        path,
        secure,
        expected,
    ) => {
        // Arrange
        const isSecure = secure;

        // Act
        const url = CookieDrafts.urlOf({ domain, path, isSecure });

        // Assert
        expect(url).toBe(expected);
    });

    test('expirationOf_WhenTheCookieIsASessionCookie_ShouldReturnUndefined', () => {
        // Arrange
        const draft = CookieDrafts.blank('example.com', true);

        // Act
        const expiration = CookieDrafts.expirationOf(draft);

        // Assert
        expect(expiration).toBeUndefined();
    });

    test('fromCookie_WhenTheCookieExpires_ShouldRoundTripTheExpiry', () => {
        // Arrange
        const expirationDate = 1_793_872_800;
        const draft = CookieDrafts.fromCookie({
            name: 'session',
            value: 'abc',
            domain: 'example.com',
            path: '/',
            hostOnly: true,
            secure: true,
            httpOnly: true,
            sameSite: 'lax',
            session: false,
            storeId: '0',
            expirationDate,
        });

        // Act
        const expiration = CookieDrafts.expirationOf(draft);

        // Assert
        expect(expiration).toBe(expirationDate);
    });

    test.each<[string, boolean, Partial<CookieDraft>]>([
        [
            'OnlyTheValueChanges',
            true,
            { value: 'xyz' },
        ],
        [
            'TheDomainDiffersOnlyInCaseAndItsLeadingDot',
            true,
            { domain: 'Example.com' },
        ],
        [
            'ThePathIsEmpty',
            true,
            { path: '' },
        ],
        [
            'TheDomainChanges',
            false,
            { domain: 'api.example.com' },
        ],
        [
            'ThePathChanges',
            false,
            { path: '/api' },
        ],
        [
            'ItBecomesHostOnly',
            false,
            { hostOnly: true },
        ],
        [
            'ItMovesIntoAPartition',
            false,
            { partitionKey: { ...PARTITION_KEY } },
        ],
    ])('isSameCookie_When%s_ShouldBe(%s)', (
        _,
        expected,
        change,
    ) => {
        // Arrange
        const cookie = aCookie();
        const draft = {
            ...CookieDrafts.fromCookie(cookie),
            ...change,
        };

        // Act
        const isSame = CookieDrafts.isSameCookie(draft, cookie);

        // Assert
        expect(isSame).toBe(expected);
    });

    test('fromCookie_WhenTheCookieIsPartitioned_ShouldKeepItsPartition', () => {
        // Arrange
        const cookie = aCookie({
            partitionKey: { ...PARTITION_KEY },
        });

        // Act
        const draft = CookieDrafts.fromCookie(cookie);

        // Assert
        expect(draft.partitionKey).toEqual(PARTITION_KEY);
        expect(CookieDrafts.isSameCookie(draft, cookie)).toBe(true);
    });
});
