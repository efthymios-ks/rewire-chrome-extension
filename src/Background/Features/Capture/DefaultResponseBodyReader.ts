import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { TextualMime } from '../../../Common/Http/TextualMime';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { CapturedBody, ReadAsyncOptions, ResponseBodyReader } from './ResponseBodyReader';
import { TIMELINE_LIMITS } from './TimelineLimits';

export class DefaultResponseBodyReader implements ResponseBodyReader {
    private readonly _debuggerClient: DebuggerClient;

    constructor(debuggerClient: DebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async readAsync({ tabId, requestId, mimeType }: ReadAsyncOptions): Promise<CapturedBody> {
        if (!TextualMime.isTextual(mimeType)) {
            return {
                body: null,
                note: `Body not captured, "${mimeType === '' ? 'no content type' : mimeType}" is not text.`,
            };
        }

        const response = await this._debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Network.getResponseBody',
            /* params: */ {
                requestId,
            },
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
        if (text.length > TIMELINE_LIMITS.MaxBodyLength) {
            return {
                body: text.slice(0, TIMELINE_LIMITS.MaxBodyLength),
                note: `Body truncated to ${TIMELINE_LIMITS.MaxBodyLength} characters.`,
            };
        }

        return {
            body: text,
            note: null,
        };
    }
}
