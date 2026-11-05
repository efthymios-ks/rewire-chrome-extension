import type { CookieDraft } from "./CookieDraft";

const MillisecondsPerSecond = 1000;
const SecondsPerMinute = 60;
const LocalDateTimeLength = 16;
const RootPath = "/";
const LeadingDotPattern = /^\./;

function toLocalDateTime(epochSeconds: number): string {
    const date = new Date(epochSeconds * MillisecondsPerSecond);
    const offsetInMilliseconds = date.getTimezoneOffset() * SecondsPerMinute * MillisecondsPerSecond;

    return new Date(date.getTime() - offsetInMilliseconds)
        .toISOString()
        .slice(0, LocalDateTimeLength);
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
            expiresAt: cookie.expirationDate === undefined ? "" : toLocalDateTime(cookie.expirationDate),
        };
    },

    blank(host: string, isSecure: boolean): CookieDraft {
        return {
            name: "",
            value: "",
            domain: host,
            path: RootPath,
            hostOnly: true,
            secure: isSecure,
            httpOnly: false,
            sameSite: "lax",
            expiresAt: "",
        };
    },

    urlOf(
        domain: string,
        path: string,
        secure: boolean
    ): string {
        const scheme = secure ? "https" : "http";

        return `${scheme}://${domain.replace(LeadingDotPattern, "")}${path || RootPath}`;
    },

    expirationOf(draft: CookieDraft): number | undefined {
        if (draft.expiresAt.trim() === "") {
            return undefined;
        }

        return Math.floor(new Date(draft.expiresAt).getTime() / MillisecondsPerSecond);
    },
};
