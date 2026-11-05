import { ContentKind } from "../../../Contracts/Timeline/ContentKind";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import { ContentFilterId } from "../../Core/ContentFilterId";

export interface ContentFilterDefinition {
    id: ContentFilterId;
    label: string;
    accepts(entry: TimelineEntrySummary): boolean;
}

export const ContentFilters: ContentFilterDefinition[] = [
    {
        id: ContentFilterId.All,
        label: "All",
        accepts: () => true,
    },
    {
        id: ContentFilterId.Json,
        label: "JSON",
        accepts: entry => entry.contentKind === ContentKind.Json,
    },
    {
        id: ContentFilterId.GraphQl,
        label: "GraphQL",
        accepts: entry => entry.contentKind === ContentKind.GraphQl,
    },
    {
        id: ContentFilterId.FormData,
        label: "Form Data",
        accepts: entry => entry.contentKind === ContentKind.FormData,
    },
];
