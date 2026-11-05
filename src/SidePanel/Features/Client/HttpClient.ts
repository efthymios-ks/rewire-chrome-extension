import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import type { ClientExchangeRequest, ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";

const BodylessMethods = [
    "GET",
    "HEAD",
];

type Fetcher = typeof fetch;
type Clock = () => number;

export interface IHttpClient {
    send(request: ClientExchangeRequest): Promise<Result<ClientExchangeResponse>>;
}

function headersFrom(response: Response): HeaderEntry[] {
    const list: HeaderEntry[] = [];
    response.headers.forEach((value, name) => list.push({
        name,
        value,
    }));

    return list;
}

function requestInitOf(request: ClientExchangeRequest): RequestInit {
    const method = request.method.toUpperCase();
    const headers = new Headers();
    request.headers
        .filter(header => header.name.trim() !== "")
        .forEach(header => headers.append(header.name, header.value));

    const init: RequestInit = {
        method,
        headers,
    };
    if (!BodylessMethods.includes(method) && request.body !== "") {
        init.body = request.body;
    }

    return init;
}

export class HttpClient implements IHttpClient {
    private readonly _fetch: Fetcher;
    private readonly _now: Clock;

    constructor(fetcher: Fetcher = fetch.bind(globalThis), clock: Clock = () => Date.now()) {
        this._fetch = fetcher;
        this._now = clock;
    }

    async send(request: ClientExchangeRequest): Promise<Result<ClientExchangeResponse>> {
        if (SafeUrl.parse(request.url) === null) {
            return Result.fail("URL is not valid.");
        }

        const startedAt = this._now();
        let response: Response;
        try {
            response = await this._fetch(request.url, requestInitOf(request));
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }

        let body: string;
        try {
            body = await response.text();
        } catch (error) {
            return Result.fail(`Reading the response body failed: ${ErrorText.of(error)}`);
        }

        return Result.ok({
            status: response.status,
            statusText: response.statusText,
            headers: headersFrom(response),
            body,
            durationInMilliseconds: this._now() - startedAt,
        });
    }
}
