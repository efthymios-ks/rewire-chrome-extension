import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import type { CookiePair } from '../Rules/Http/CookiePair';
import type { RequestSnippet } from './RequestSnippet';
import type { SnippetBody } from './SnippetBody';
import type { SnippetRequest } from './SnippetRequest';

export abstract class RequestSnippetBase implements RequestSnippet {
    private readonly _method: string;
    private readonly _url: string;
    private readonly _headers: HeaderEntry[];
    private readonly _cookies: CookiePair[];
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

    get url(): string {
        return this._url;
    }

    get headers(): HeaderEntry[] {
        return this._headers;
    }

    get cookies(): CookiePair[] {
        return this._cookies;
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
