export interface CookieDraft {
    name: string;
    value: string;
    domain: string;
    path: string;
    hostOnly: boolean;
    secure: boolean;
    httpOnly: boolean;
    sameSite: chrome.cookies.Cookie["sameSite"];
    expiresAt: string;
}
