import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import type { ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import { ClientBodies } from "./ClientBodies";
import type { ClientRequest } from "./ClientRequest";

type Fetcher = typeof fetch;
type Clock = () => number;

export interface IHttpClient {
    send(request: ClientRequest): Promise<Result<ClientExchangeResponse>>;
}

function headersFrom(response: Response): HeaderEntry[] {
    const list: HeaderEntry[] = [];
    response.headers.forEach((value, name) => list.push({
        name,
        value,
    }));

    return list;
}

function requestInitOf(request: ClientRequest): RequestInit {
    const method = request.method.toUpperCase();
    const sentBody = ClientBodies.sentWith(method, request.body);
    const headers = new Headers();
    ClientBodies
        .withContentType(request.headers, sentBody)
        .forEach(header => headers.append(header.name.trim(), header.value));

    const init: RequestInit = {
        method,
        headers,
    };
    const body = ClientBodies.fetchBodyOf(sentBody);
    if (body !== null) {
        init.body = body;
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

    async send(request: ClientRequest): Promise<Result<ClientExchangeResponse>> {
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
