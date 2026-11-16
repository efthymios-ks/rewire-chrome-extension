import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { Result } from '../../../Common/Results/Result';
import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { HTTP_METHODS } from '../../../Contracts/Http/HttpMethods';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import { ClientBodies } from './ClientBodies';
import type { ClientBody } from './ClientBody';
import type { ClientRequest } from './ClientRequest';
import type { HttpClient } from './HttpClient';

const ENCODING_URL = 'https://rewire.invalid/';

interface EncodedBody {
    base64: string;
    contentType: string | null;
}

async function encodedBodyOfAsync(body: ClientBody): Promise<Result<EncodedBody | null>> {
    const fetchBody = ClientBodies.fetchBodyOf(body);
    if (fetchBody == null) {
        return Result.ok(null);
    }

    return Result.attemptAsync(
        /* action: */ async () => {
            const encoded = new Request(ENCODING_URL, {
                method: HTTP_METHODS.Post,
                body: fetchBody,
            });
            const bytes = new Uint8Array(await encoded.arrayBuffer());

            return {
                base64: Base64Text.fromBytes(bytes),
                contentType: encoded.headers.get(HEADER_NAMES.ContentType),
            };
        },
        /* failurePrefix: */ 'Reading the body failed',
    );
}

function headersOf(request: ClientRequest, encoded: EncodedBody | null): HeaderEntry[] {
    const headers = ClientBodies
        .withContentType(request.headers, request.body)
        .map(header => ({
            name: header.name.trim(),
            value: header.value,
        }));
    const hasContentType = headers.some(
        header => header.name.toLowerCase() === HEADER_NAMES.ContentType.toLowerCase(),
    );
    if (hasContentType || encoded?.contentType == null) {
        return headers;
    }

    return [
        ...headers,
        {
            name: HEADER_NAMES.ContentType,
            value: encoded.contentType,
        },
    ];
}

export class DebuggerHttpClient implements HttpClient {
    private readonly _connection: WorkerConnection;

    constructor(connection: WorkerConnection) {
        this._connection = connection;
    }

    async sendAsync(request: ClientRequest): Promise<Result<ClientExchangeResponse>> {
        if (SafeUrl.parse(request.url) == null) {
            return Result.fail('URL is not valid.');
        }

        const encoded = await encodedBodyOfAsync(request.body);
        if (encoded.hasErrors) {
            return Result.fail(encoded.error);
        }

        return this._connection.sendAsync<typeof PANEL_COMMAND_TYPE.SendClientRequest>({
            type: PANEL_COMMAND_TYPE.SendClientRequest,
            request: {
                method: request.method.toUpperCase(),
                url: request.url,
                headers: headersOf(request, encoded.value),
                bodyBase64: encoded.value?.base64 ?? null,
            },
        });
    }
}
