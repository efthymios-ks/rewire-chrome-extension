import type { RequestSnapshot, SnippetOptions } from "../../../Common/CodeGen/RequestSnapshot";
import { RequestSnippets } from "../../../Common/CodeGen/RequestSnippets";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";

export const DetailSnippets = {
    snapshotOf(detail: TimelineEntryDetail): RequestSnapshot {
        return {
            method: detail.summary.method,
            url: detail.summary.url,
            headers: detail.requestHeaders,
            body: detail.requestBody,
        };
    },

    of(
        snapshot: RequestSnapshot,
        snippetId: string,
        options: SnippetOptions
    ): string {
        return RequestSnippets
            .get(snippetId)
            .from(snapshot, options)
            .toString();
    },
};
