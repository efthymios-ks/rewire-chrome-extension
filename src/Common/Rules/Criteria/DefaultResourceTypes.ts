import type { DnrResourceType } from './DnrResourceType';

export const DEFAULT_RESOURCE_TYPES = {
    Browser: [
        'xmlhttprequest',
        'other',
        'main_frame',
        'sub_frame',
    ] as DnrResourceType[],
    Debugger: [
        'XHR',
        'Fetch',
        'Document',
    ],
} as const;
