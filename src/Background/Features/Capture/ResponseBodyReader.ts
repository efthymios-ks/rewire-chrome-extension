import { Base64Text } from "../../../Common/Encoding/Base64Text";
import { TextualMime } from "../../../Common/Http/TextualMime";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import { TimelineLimits } from "./TimelineLimits";

export interface CapturedBody {
    body: string | null;
    note: string | null;
}

export interface IResponseBodyReader {
    read(
        tabId: number,
        requestId: string,
        mimeType: string
    ): Promise<CapturedBody>;
}

export class ResponseBodyReader implements IResponseBodyReader {
    private readonly _debuggerClient: IDebuggerClient;

    constructor(debuggerClient: IDebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async read(
        tabId: number,
        requestId: string,
        mimeType: string
    ): Promise<CapturedBody> {
        if (!TextualMime.isTextual(mimeType)) {
            return {
                body: null,
                note: `Body not captured, "${mimeType || "no content type"}" is not text.`,
            };
        }

        const response = await this._debuggerClient.send(
            tabId,
            "Network.getResponseBody",
            {
                requestId,
            }
        );
        if (response.hasErrors) {
            return {
                body: null,
                note: `Body unavailable: ${response.error}`,
            };
        }

        const text = response.value.base64Encoded
            ? Base64Text.toUtf8(response.value.body)
            : response.value.body;
        if (text.length > TimelineLimits.MaxBodyLength) {
            return {
                body: text.slice(0, TimelineLimits.MaxBodyLength),
                note: `Body truncated to ${TimelineLimits.MaxBodyLength} characters.`,
            };
        }

        return {
            body: text,
            note: null,
        };
    }
}
