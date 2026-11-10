import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import type { CookiePair } from "../Rules/Http/CookieHeader";
import type { RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import type { SnippetBody } from "./SnippetBody";

export interface IRequestSnippet {
    method: string;
    url: string;
    headers: HeaderEntry[];
    cookies: CookiePair[];
    body: SnippetBody;
    toString(): string;
}

export interface RequestSnippetType {
    readonly id: string;
    readonly label: string;
    tryParse(text: string): IRequestSnippet | null;
    from(snapshot: RequestSnapshot, options?: SnippetOptions): IRequestSnippet;
}
