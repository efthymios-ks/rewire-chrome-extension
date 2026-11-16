import type { RequestSnapshot } from '../../../Common/CodeGen/RequestSnapshot';
import { RequestSnippets } from '../../../Common/CodeGen/RequestSnippets';
import type { SnippetOptions } from '../../../Common/CodeGen/SnippetOptions';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';

export interface DetailSnippetsOfOptions {
    snapshot: RequestSnapshot;
    snippetId: string;
    options: SnippetOptions;
}

export const DetailSnippets = {
    snapshotOf(detail: TimelineEntryDetail): RequestSnapshot {
        return {
            method: detail.summary.method,
            url: detail.summary.url,
            headers: detail.requestHeaders,
            body: detail.requestBody,
        };
    },

    of({ snapshot, snippetId, options }: DetailSnippetsOfOptions): string {
        return RequestSnippets
            .get(snippetId)
            .from(snapshot, options)
            .toString();
    },
};
