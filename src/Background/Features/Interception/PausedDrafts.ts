import type { Protocol } from "devtools-protocol";
import { Base64Text } from "../../../Common/Encoding/Base64Text";
import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import type { RequestDraft, ResponseDraft } from "../../../Common/Rules/Drafts/Drafts";

const ErrorStatus = 0;

function bodyOf(request: Protocol.Network.Request): string | null {
    if (request.postData !== undefined) {
        return request.postData;
    }

    const entries = request.postDataEntries ?? [];
    if (entries.length === 0) {
        return null;
    }

    return entries
        .map(entry => entry.bytes === undefined ? "" : Base64Text.toUtf8(entry.bytes))
        .join("");
}

export const PausedDrafts = {
    requestOf(event: Protocol.Fetch.RequestPausedEvent): RequestDraft {
        return {
            url: event.request.url,
            method: event.request.method,
            headers: HeaderLookup.fromRecord(event.request.headers),
            body: bodyOf(event.request),
            resourceType: event.resourceType,
            response: null,
        };
    },

    responseOf(event: Protocol.Fetch.RequestPausedEvent, body: string | null): ResponseDraft {
        return {
            status: event.responseStatusCode ?? ErrorStatus,
            headers: event.responseHeaders ?? [],
            body,
            errorReason: event.responseErrorReason ?? null,
        };
    },
};
