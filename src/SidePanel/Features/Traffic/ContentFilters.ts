import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { CONTENT_FILTER_ID, type ContentFilterId } from '../../Core/ContentFilterId';

const DOCUMENT_RESOURCE_TYPE = 'Document';

export interface ContentFilterDefinition {
    id: ContentFilterId;
    label: string;
    accepts(entry: TimelineEntrySummary): boolean;
}

export const CONTENT_FILTERS: ContentFilterDefinition[] = [
    {
        id: CONTENT_FILTER_ID.All,
        label: 'All',
        accepts: () => true,
    },
    {
        id: CONTENT_FILTER_ID.Json,
        label: 'JSON',
        accepts: entry => entry.contentKind === CONTENT_KIND.Json,
    },
    {
        id: CONTENT_FILTER_ID.GraphQl,
        label: 'GraphQL',
        accepts: entry => entry.contentKind === CONTENT_KIND.GraphQl,
    },
    {
        id: CONTENT_FILTER_ID.FormData,
        label: 'Form Data',
        accepts: entry => entry.contentKind === CONTENT_KIND.FormData,
    },
    // A page navigation is a request type, not a content kind, so a form post shows under Form Data too.
    {
        id: CONTENT_FILTER_ID.Document,
        label: 'Document',
        accepts: entry => entry.resourceType === DOCUMENT_RESOURCE_TYPE,
    },
];
