import { Base64Text } from "../../../Common/Encoding/Base64Text";
import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import type { ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { IWorkerConnection } from "../../Core/WorkerConnection";
import { ClientBodies } from "./ClientBodies";
import type { ClientBody, ClientRequest } from "./ClientRequest";
import type { IHttpClient } from "./HttpClient";

const EncodingUrl = "https://rewire.invalid/";
const EncodingMethod = "POST";
const ContentTypeHeader = "Content-Type";

interface EncodedBody {
    base64: string;
    contentType: string | null;
}

async function encodedBodyOf(body: ClientBody): Promise<Result<EncodedBody | null>> {
    const fetchBody = ClientBodies.fetchBodyOf(body);
    if (fetchBody === null) {
        return Result.ok(null);
    }

    try {
        const encoded = new Request(EncodingUrl, {
            method: EncodingMethod,
            body: fetchBody,
        });
        const bytes = new Uint8Array(await encoded.arrayBuffer());

        return Result.ok({
            base64: Base64Text.fromBytes(bytes),
            contentType: encoded.headers.get(ContentTypeHeader),
        });
    } catch (error) {
        return Result.fail(`Reading the body failed: ${ErrorText.of(error)}`);
    }
}

function headersOf(request: ClientRequest, encoded: EncodedBody | null): HeaderEntry[] {
    const headers = ClientBodies.withContentType(request.headers, request.body);
    const hasContentType = headers.some(header => header.name.trim().toLowerCase() === ContentTypeHeader.toLowerCase());
    if (hasContentType || encoded === null || encoded.contentType === null) {
        return headers;
    }

    return [
        ...headers,
        {
            name: ContentTypeHeader,
            value: encoded.contentType,
        },
    ];
}

export class DebuggerHttpClient implements IHttpClient {
    private readonly _connection: IWorkerConnection;

    constructor(connection: IWorkerConnection) {
        this._connection = connection;
    }

    async send(request: ClientRequest): Promise<Result<ClientExchangeResponse>> {
        if (SafeUrl.parse(request.url) === null) {
            return Result.fail("URL is not valid.");
        }

        const encoded = await encodedBodyOf(request.body);
        if (encoded.hasErrors) {
            return Result.fail(encoded.error);
        }

        return this._connection.send<PanelCommandType.SendClientRequest>({
            type: PanelCommandType.SendClientRequest,
            request: {
                method: request.method.toUpperCase(),
                url: request.url,
                headers: headersOf(request, encoded.value),
                bodyBase64: encoded.value?.base64 ?? null,
            },
        });
    }
}
