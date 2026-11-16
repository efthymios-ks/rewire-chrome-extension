import { Result } from '../../../Common/Results/Result';
import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { ClientBodies } from './ClientBodies';
import type { ClientRequest } from './ClientRequest';
import type { HttpClient } from './HttpClient';

type Fetcher = typeof fetch;
type Clock = () => number;

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
        .forEach(header => headers.append(
            /* name: */ header.name.trim(),
            /* value: */ header.value,
        ));

    const init: RequestInit = {
        method,
        headers,
    };
    const body = ClientBodies.fetchBodyOf(sentBody);
    if (body != null) {
        init.body = body;
    }

    return init;
}

function readTextAsync(response: Response): Promise<Result<string>> {
    return Result.attemptAsync(() => response.text(), 'Reading the response body failed');
}

export class DefaultHttpClient implements HttpClient {
    private readonly _fetch: Fetcher;
    private readonly _now: Clock;

    constructor(fetcher: Fetcher = fetch.bind(globalThis), clock: Clock = () => Date.now()) {
        this._fetch = fetcher;
        this._now = clock;
    }

    async sendAsync(request: ClientRequest): Promise<Result<ClientExchangeResponse>> {
        if (SafeUrl.parse(request.url) == null) {
            return Result.fail('URL is not valid.');
        }

        const startedAt = this._now();
        const response = await this.fetchAsync(request);
        if (response.hasErrors) {
            return response;
        }

        const body = await readTextAsync(response.value);
        if (body.hasErrors) {
            return body;
        }

        return Result.ok({
            status: response.value.status,
            statusText: response.value.statusText,
            headers: headersFrom(response.value),
            body: body.value,
            durationInMilliseconds: this._now() - startedAt,
        });
    }

    private fetchAsync(request: ClientRequest): Promise<Result<Response>> {
        return Result.attemptAsync(() => this._fetch(
            /* input: */ request.url,
            /* init: */ requestInitOf(request),
        ));
    }
}
