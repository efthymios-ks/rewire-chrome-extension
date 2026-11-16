import { Result } from '../../../Common/Results/Result';
import type { CookieDraft } from './CookieDraft';

export interface CookiePage {
    url: string;
    tabId: number;
}

export interface CookieClient {
    listAsync(page: CookiePage): Promise<Result<chrome.cookies.Cookie[]>>;
    saveAsync(draft: CookieDraft): Promise<Result<void>>;
    removeAsync(cookie: chrome.cookies.Cookie): Promise<Result<void>>;
    subscribe(listener: (cookie: chrome.cookies.Cookie) => void): void;
}
