import type { CookieDraft } from './CookieDraft';
import { CookieKeys } from './CookieKeys';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const LOCAL_DATE_TIME_LENGTH = 16;
const ROOT_PATH = '/';
const LEADING_DOT_PATTERN = /^\./;

function toLocalDateTime(epochSeconds: number): string {
    const date = new Date(epochSeconds * MILLISECONDS_PER_SECOND);
    const offsetInMilliseconds = date.getTimezoneOffset() * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

    return new Date(date.getTime() - offsetInMilliseconds)
        .toISOString()
        .slice(0, LOCAL_DATE_TIME_LENGTH);
}

function hostOf(domain: string): string {
    return domain
        .replace(LEADING_DOT_PATTERN, '')
        .toLowerCase();
}

function pathOf(path: string): string {
    return path === '' ? ROOT_PATH : path;
}

export interface UrlOfOptions {
    domain: string;
    path: string;
    isSecure: boolean;
}

export const CookieDrafts = {
    fromCookie(cookie: chrome.cookies.Cookie): CookieDraft {
        return {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            hostOnly: cookie.hostOnly,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expiresAt: cookie.expirationDate == null ? '' : toLocalDateTime(cookie.expirationDate),
            partitionKey: cookie.partitionKey,
        };
    },

    isSameCookie(draft: CookieDraft, cookie: chrome.cookies.Cookie): boolean {
        return draft.name === cookie.name
            && draft.hostOnly === cookie.hostOnly
            && hostOf(draft.domain) === hostOf(cookie.domain)
            && pathOf(draft.path) === pathOf(cookie.path)
            && CookieKeys.partitionOf(draft.partitionKey) === CookieKeys.partitionOf(cookie.partitionKey);
    },

    blank(host: string, isSecure: boolean): CookieDraft {
        return {
            name: '',
            value: '',
            domain: host,
            path: ROOT_PATH,
            hostOnly: true,
            secure: isSecure,
            httpOnly: false,
            sameSite: 'lax',
            expiresAt: '',
        };
    },

    urlOf({ domain, path, isSecure }: UrlOfOptions): string {
        const scheme = isSecure ? 'https' : 'http';

        return `${scheme}://${domain.replace(LEADING_DOT_PATTERN, '')}${pathOf(path)}`;
    },

    expirationOf(draft: CookieDraft): number | undefined {
        if (draft.expiresAt.trim() === '') {
            return undefined;
        }

        return Math.floor(new Date(draft.expiresAt).getTime() / MILLISECONDS_PER_SECOND);
    },
};
