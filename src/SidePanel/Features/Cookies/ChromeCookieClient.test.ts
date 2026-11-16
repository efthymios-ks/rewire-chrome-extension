import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeCookieClient } from './ChromeCookieClient';
import type { CookieDraft } from './CookieDraft';

const MILLISECONDS_PER_SECOND = 1000;
const PAGE = Object.freeze({
    url: 'https://api.example.com/users',
    tabId: 7,
});
const PARTITION_KEY = Object.freeze({
    topLevelSite: 'https://example.com',
    hasCrossSiteAncestor: false,
});

function aCookie(overrides: Partial<chrome.cookies.Cookie> = {}): chrome.cookies.Cookie {
    return {
        name: 'session',
        value: 'abc123',
        domain: '.example.com',
        hostOnly: false,
        path: '/app',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        session: true,
        storeId: '0',
        ...overrides,
    };
}

function aDraft(overrides: Partial<CookieDraft> = {}): CookieDraft {
    return {
        name: 'session',
        value: 'abc123',
        domain: 'api.example.com',
        path: '/',
        hostOnly: true,
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        expiresAt: '',
        ...overrides,
    };
}

function aPartitionedCookie(): chrome.cookies.Cookie {
    return aCookie({
        name: 'embed',
        partitionKey: { ...PARTITION_KEY },
    });
}

// Chrome lists only unpartitioned cookies unless the query names a partition.
function getAllLikeChrome(partitionedCookies: chrome.cookies.Cookie[]) {
    return vi.fn(async (details: chrome.cookies.GetAllDetails) => details.partitionKey == null
        ? [aCookie()]
        : [
            aCookie(),
            ...partitionedCookies,
        ]);
}

function stubCookies(overrides: Record<string, unknown> = {}) {
    const cookies = {
        getAll: vi.fn().mockResolvedValue([aCookie()]),
        getPartitionKey: vi.fn().mockResolvedValue({
            partitionKey: { ...PARTITION_KEY },
        }),
        set: vi.fn().mockResolvedValue(aCookie()),
        remove: vi.fn().mockResolvedValue({}),
        onChanged: {
            addListener: vi.fn(),
        },
        ...overrides,
    };
    vi.stubGlobal('chrome', {
        cookies,
    });

    return cookies;
}

describe('ChromeCookieClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('listAsync_WhenChromeAnswers_ShouldReturnTheCookiesForThatUrl', async () => {
        // Arrange
        const cookies = stubCookies();
        const client = new ChromeCookieClient();

        // Act
        const listed = await client.listAsync(PAGE);

        // Assert
        expect(listed).toEqual({
            hasErrors: false,
            value: [aCookie()],
        });
        expect(cookies.getAll).toHaveBeenCalledWith({
            url: 'https://api.example.com/users',
        });
    });

    test('listAsync_WhenThePageHasPartitionedCookies_ShouldListThemOnceNextToTheOthers', async () => {
        // Arrange
        const cookies = stubCookies({
            getAll: getAllLikeChrome([aPartitionedCookie()]),
        });
        const client = new ChromeCookieClient();

        // Act
        const listed = await client.listAsync(PAGE);

        // Assert
        expect(listed).toEqual({
            hasErrors: false,
            value: [
                aCookie(),
                aPartitionedCookie(),
            ],
        });
        expect(cookies.getPartitionKey).toHaveBeenCalledWith({
            tabId: 7,
            frameId: 0,
        });
        expect(cookies.getAll).toHaveBeenCalledWith({
            url: 'https://api.example.com/users',
            partitionKey: {
                topLevelSite: 'https://example.com',
            },
        });
    });

    test('listAsync_WhenChromeCannotTellThePartitionKey_ShouldUseThePageOrigin', async () => {
        // Arrange
        const cookies = stubCookies({
            getAll: getAllLikeChrome([aPartitionedCookie()]),
            getPartitionKey: undefined,
        });
        const client = new ChromeCookieClient();

        // Act
        const listed = await client.listAsync(PAGE);

        // Assert
        expect(listed.hasErrors ? [] : listed.value.map(cookie => cookie.name)).toEqual([
            'session',
            'embed',
        ]);
        expect(cookies.getAll).toHaveBeenCalledWith({
            url: 'https://api.example.com/users',
            partitionKey: {
                topLevelSite: 'https://api.example.com',
            },
        });
    });

    test('listAsync_WhenThePartitionedQueryFails_ShouldStillListTheUnpartitionedCookies', async () => {
        // Arrange
        stubCookies({
            getAll: vi.fn(async (details: chrome.cookies.GetAllDetails) => {
                if (details.partitionKey != null) {
                    throw new Error('Invalid partition key');
                }

                return [aCookie()];
            }),
        });
        const client = new ChromeCookieClient();

        // Act
        const listed = await client.listAsync(PAGE);

        // Assert
        expect(listed).toEqual({
            hasErrors: false,
            value: [aCookie()],
        });
    });

    test('listAsync_WhenChromeThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubCookies({
            getAll: vi.fn().mockRejectedValue(new Error('No host permission')),
        });
        const client = new ChromeCookieClient();

        // Act
        const listed = await client.listAsync(PAGE);

        // Assert
        expect(listed).toEqual({
            hasErrors: true,
            error: 'Reading cookies failed: No host permission',
        });
    });

    test('saveAsync_WhenTheCookieIsHostOnly_ShouldOmitTheDomain', async () => {
        // Arrange
        const cookies = stubCookies();
        const client = new ChromeCookieClient();

        // Act
        const saved = await client.saveAsync(aDraft());

        // Assert
        expect(saved.hasErrors).toBe(false);
        expect(cookies.set).toHaveBeenCalledWith({
            url: 'https://api.example.com/',
            name: 'session',
            value: 'abc123',
            domain: undefined,
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'strict',
            expirationDate: undefined,
        });
    });

    test('saveAsync_WhenTheCookieSpansSubdomainsAndExpires_ShouldSendDomainAndExpiry', async () => {
        // Arrange
        const cookies = stubCookies();
        const client = new ChromeCookieClient();
        const expiresAt = '2030-01-02T03:04';

        // Act
        await client.saveAsync(aDraft({
            domain: '.example.com',
            path: '/app',
            hostOnly: false,
            secure: false,
            expiresAt,
        }));

        // Assert
        expect(cookies.set).toHaveBeenCalledWith(expect.objectContaining({
            url: 'http://example.com/app',
            domain: '.example.com',
            secure: false,
            expirationDate: Math.floor(new Date(expiresAt).getTime() / MILLISECONDS_PER_SECOND),
        }));
    });

    test('saveAsync_WhenChromeRejectsTheCookie_ShouldExplainTheLikelyCause', async () => {
        // Arrange
        stubCookies({
            set: vi.fn().mockResolvedValue(null),
        });
        const client = new ChromeCookieClient();

        // Act
        const saved = await client.saveAsync(aDraft());

        // Assert
        expect(saved).toEqual({
            hasErrors: true,
            error: 'Chrome rejected the cookie. SameSite=None needs Secure, and the domain must match the page.',
        });
    });

    test('saveAsync_WhenChromeThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubCookies({
            set: vi.fn().mockRejectedValue('Invalid url'),
        });
        const client = new ChromeCookieClient();

        // Act
        const saved = await client.saveAsync(aDraft());

        // Assert
        expect(saved).toEqual({
            hasErrors: true,
            error: 'Saving the cookie failed: Invalid url',
        });
    });

    test('removeAsync_WhenCalled_ShouldRemoveItFromItsStoreByUrlAndName', async () => {
        // Arrange
        const cookies = stubCookies();
        const client = new ChromeCookieClient();

        // Act
        const removed = await client.removeAsync(aCookie({
            storeId: '1',
        }));

        // Assert
        expect(removed.hasErrors).toBe(false);
        expect(cookies.remove).toHaveBeenCalledWith({
            url: 'https://example.com/app',
            name: 'session',
            storeId: '1',
        });
    });

    test('saveAsync_WhenTheCookieIsPartitioned_ShouldKeepItInItsPartition', async () => {
        // Arrange
        const cookies = stubCookies();
        const client = new ChromeCookieClient();
        const partitionKey = {
            topLevelSite: 'https://shop.example',
        };

        // Act
        await client.saveAsync(aDraft({
            partitionKey,
        }));

        // Assert
        expect(cookies.set).toHaveBeenCalledWith(expect.objectContaining({
            partitionKey,
        }));
    });

    test('removeAsync_WhenTheCookieIsPartitioned_ShouldRemoveItFromItsPartition', async () => {
        // Arrange
        const cookies = stubCookies();
        const client = new ChromeCookieClient();
        const partitionKey = {
            topLevelSite: 'https://shop.example',
        };

        // Act
        await client.removeAsync(aCookie({
            partitionKey,
        }));

        // Assert
        expect(cookies.remove).toHaveBeenCalledWith({
            url: 'https://example.com/app',
            name: 'session',
            storeId: '0',
            partitionKey,
        });
    });

    test('removeAsync_WhenChromeThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubCookies({
            remove: vi.fn().mockRejectedValue(new Error('Gone')),
        });
        const client = new ChromeCookieClient();

        // Act
        const removed = await client.removeAsync(aCookie());

        // Assert
        expect(removed).toEqual({
            hasErrors: true,
            error: 'Deleting the cookie failed: Gone',
        });
    });

    test('subscribe_WhenACookieChanges_ShouldPassTheCookieOn', () => {
        // Arrange
        const cookies = stubCookies();
        const client = new ChromeCookieClient();
        const listener = vi.fn();
        client.subscribe(listener);
        const onChanged = cookies.onChanged.addListener.mock.calls[0]![0] as (
            changeInfo: chrome.cookies.CookieChangeInfo,
        ) => void;

        // Act
        onChanged({
            cookie: aCookie({
                value: 'rotated',
            }),
            removed: false,
            cause: 'explicit',
        });

        // Assert
        expect(listener).toHaveBeenCalledWith(aCookie({
            value: 'rotated',
        }));
    });
});
