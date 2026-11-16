import { ErrorText } from '../../../Common/Errors/ErrorText';
import { Result } from '../../../Common/Results/Result';
import type { CookieClient, CookiePage } from './CookieClient';
import type { CookieDraft } from './CookieDraft';
import { CookieDrafts } from './CookieDrafts';
import { CookieKeys } from './CookieKeys';

const TOP_FRAME_ID = 0;

// Chrome 132 adds getPartitionKey; before that, the page's origin stands in for its site.
async function topLevelSiteAsync({ url, tabId }: CookiePage): Promise<string | undefined> {
    if (typeof chrome.cookies.getPartitionKey !== 'function') {
        return new URL(url).origin;
    }

    const { partitionKey } = await chrome.cookies.getPartitionKey({
        tabId,
        frameId: TOP_FRAME_ID,
    });

    return partitionKey.topLevelSite;
}

// Without a partition key, getAll leaves partitioned (CHIPS) cookies out.
async function partitionedCookiesAsync(page: CookiePage): Promise<chrome.cookies.Cookie[]> {
    try {
        const topLevelSite = await topLevelSiteAsync(page);
        if (topLevelSite == null) {
            return [];
        }

        return await chrome.cookies.getAll({
            url: page.url,
            partitionKey: {
                topLevelSite,
            },
        });
    } catch {
        return [];
    }
}

function uniqueCookies(cookies: chrome.cookies.Cookie[]): chrome.cookies.Cookie[] {
    const byKey = new Map(cookies.map(cookie => [
        CookieKeys.of(cookie),
        cookie,
    ]));

    return [...byKey.values()];
}

export class ChromeCookieClient implements CookieClient {
    async listAsync(page: CookiePage): Promise<Result<chrome.cookies.Cookie[]>> {
        const unpartitioned = await Result.attemptAsync(
            /* action: */ () => chrome.cookies.getAll({
                url: page.url,
            }),
            /* failurePrefix: */ 'Reading cookies failed',
        );
        if (unpartitioned.hasErrors) {
            return unpartitioned;
        }

        return Result.ok(uniqueCookies([
            ...unpartitioned.value,
            ...await partitionedCookiesAsync(page),
        ]));
    }

    async saveAsync(draft: CookieDraft): Promise<Result<void>> {
        try {
            const saved = await chrome.cookies.set({
                url: CookieDrafts.urlOf({ domain: draft.domain, path: draft.path, isSecure: draft.secure }),
                name: draft.name,
                value: draft.value,
                domain: draft.hostOnly ? undefined : draft.domain,
                path: draft.path,
                secure: draft.secure,
                httpOnly: draft.httpOnly,
                sameSite: draft.sameSite,
                expirationDate: CookieDrafts.expirationOf(draft),
                partitionKey: draft.partitionKey,
            });
            if (saved == null) {
                return Result.fail('Chrome rejected the cookie. SameSite=None needs Secure, and the domain must match the page.');
            }

            return Result.done();
        } catch (error) {
            return Result.fail(`Saving the cookie failed: ${ErrorText.of(error)}`);
        }
    }

    removeAsync(cookie: chrome.cookies.Cookie): Promise<Result<void>> {
        return Result.attemptAsync(
            /* action: */ async () => {
                await chrome.cookies.remove({
                    url: CookieDrafts.urlOf({
                        domain: cookie.domain,
                        path: cookie.path,
                        isSecure: cookie.secure,
                    }),
                    name: cookie.name,
                    storeId: cookie.storeId,
                    partitionKey: cookie.partitionKey,
                });
            },
            /* failurePrefix: */ 'Deleting the cookie failed',
        );
    }

    subscribe(listener: (cookie: chrome.cookies.Cookie) => void): void {
        chrome.cookies.onChanged.addListener(changeInfo => listener(changeInfo.cookie));
    }
}
