import { CONTENT_KIND, type ContentKind } from '../../../Contracts/Timeline/ContentKind';

export const CONTENT_KIND_LABELS: Record<ContentKind, string> = Object.freeze({
    [CONTENT_KIND.Json]: 'JSON',
    [CONTENT_KIND.GraphQl]: 'GQL',
    [CONTENT_KIND.FormData]: 'FORM',
    [CONTENT_KIND.Other]: '',
});
