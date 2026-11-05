import { type RequestSnapshot, type SnippetOptions, SnapshotVariant } from "../../../Common/CodeGen/RequestSnapshot";
import { RequestSnapshots } from "../../../Common/CodeGen/RequestSnapshots";
import { SnippetGenerators } from "../../../Common/CodeGen/SnippetGenerators";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";

export const DetailSnippets = {
    snapshotOf(detail: TimelineEntryDetail, useModified: boolean): RequestSnapshot {
        return RequestSnapshots.of(
            {
                method: detail.summary.method,
                url: detail.summary.url,
                headers: detail.requestHeaders,
                body: detail.requestBody,
                changes: detail.changes,
            },
            useModified ? SnapshotVariant.Modified : SnapshotVariant.Original
        );
    },

    of(
        snapshot: RequestSnapshot,
        generatorId: string,
        options: SnippetOptions
    ): string {
        return SnippetGenerators
            .get(generatorId)
            .generate(snapshot, options);
    },
};
