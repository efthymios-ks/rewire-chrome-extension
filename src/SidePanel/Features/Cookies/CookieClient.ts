import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import type { CookieDraft } from "./CookieDraft";
import { CookieDrafts } from "./CookieDrafts";

export interface ICookieClient {
    list(url: string): Promise<Result<chrome.cookies.Cookie[]>>;
    save(draft: CookieDraft): Promise<Result<void>>;
    remove(cookie: chrome.cookies.Cookie): Promise<Result<void>>;
    subscribe(listener: (cookie: chrome.cookies.Cookie) => void): void;
}

export class CookieClient implements ICookieClient {
    async list(url: string): Promise<Result<chrome.cookies.Cookie[]>> {
        try {
            const cookies = await chrome.cookies.getAll({
                url,
            });

            return Result.ok(cookies);
        } catch (error) {
            return Result.fail(`Reading cookies failed: ${ErrorText.of(error)}`);
        }
    }

    async save(draft: CookieDraft): Promise<Result<void>> {
        try {
            const saved = await chrome.cookies.set({
                url: CookieDrafts.urlOf(
                    draft.domain,
                    draft.path,
                    draft.secure
                ),
                name: draft.name,
                value: draft.value,
                domain: draft.hostOnly ? undefined : draft.domain,
                path: draft.path,
                secure: draft.secure,
                httpOnly: draft.httpOnly,
                sameSite: draft.sameSite,
                expirationDate: CookieDrafts.expirationOf(draft),
            });
            if (saved === undefined || saved === null) {
                return Result.fail("Chrome rejected the cookie. SameSite=None needs Secure, and the domain must match the page.");
            }

            return Result.done();
        } catch (error) {
            return Result.fail(`Saving the cookie failed: ${ErrorText.of(error)}`);
        }
    }

    async remove(cookie: chrome.cookies.Cookie): Promise<Result<void>> {
        try {
            await chrome.cookies.remove({
                url: CookieDrafts.urlOf(
                    cookie.domain,
                    cookie.path,
                    cookie.secure
                ),
                name: cookie.name,
                storeId: cookie.storeId,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(`Deleting the cookie failed: ${ErrorText.of(error)}`);
        }
    }

    subscribe(listener: (cookie: chrome.cookies.Cookie) => void): void {
        chrome.cookies.onChanged.addListener(changeInfo => listener(changeInfo.cookie));
    }
}
