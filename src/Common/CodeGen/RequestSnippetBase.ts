import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import type { CookiePair } from "../Rules/Http/CookieHeader";
import type { IRequestSnippet } from "./IRequestSnippet";
import type { SnippetBody } from "./SnippetBody";
import type { SnippetRequest } from "./SnippetRequest";

export abstract class RequestSnippetBase implements IRequestSnippet {
    private _method: string;
    private _url: string;
    private _headers: HeaderEntry[];
    private _cookies: CookiePair[];
    private _body: SnippetBody;

    constructor(request: SnippetRequest) {
        this._method = request.method.toUpperCase();
        this._url = request.url;
        this._headers = request.headers;
        this._cookies = request.cookies;
        this._body = request.body;
    }

    get method(): string {
        return this._method;
    }

    set method(value: string) {
        this._method = value.toUpperCase();
    }

    get url(): string {
        return this._url;
    }

    set url(value: string) {
        this._url = value;
    }

    get headers(): HeaderEntry[] {
        return this._headers;
    }

    set headers(value: HeaderEntry[]) {
        this._headers = value;
    }

    get cookies(): CookiePair[] {
        return this._cookies;
    }

    set cookies(value: CookiePair[]) {
        this._cookies = value;
    }

    get body(): SnippetBody {
        return this._body;
    }

    set body(value: SnippetBody) {
        this._body = value;
    }

    protected get request(): SnippetRequest {
        return {
            method: this._method,
            url: this._url,
            headers: this._headers,
            cookies: this._cookies,
            body: this._body,
        };
    }

    abstract toString(): string;
}
