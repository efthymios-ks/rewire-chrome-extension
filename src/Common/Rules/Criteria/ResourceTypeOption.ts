import type { DnrResourceType } from './DnrResourceType';

export interface ResourceTypeOption {
    id: string;
    label: string;
    debuggerTypes: string[];
    browserTypes: DnrResourceType[];
}

export const RESOURCE_TYPE_OPTIONS: ResourceTypeOption[] = [
    {
        id: 'fetch',
        label: 'Fetch',
        debuggerTypes: [
            'Fetch',
            'XHR',
        ],
        browserTypes: ['xmlhttprequest'],
    },
    {
        id: 'xhr',
        label: 'XHR',
        debuggerTypes: [
            'XHR',
            'Fetch',
        ],
        browserTypes: ['xmlhttprequest'],
    },
    {
        id: 'document',
        label: 'Document',
        debuggerTypes: ['Document'],
        browserTypes: [
            'main_frame',
            'sub_frame',
        ],
    },
    {
        id: 'script',
        label: 'Script',
        debuggerTypes: ['Script'],
        browserTypes: ['script'],
    },
    {
        id: 'stylesheet',
        label: 'Stylesheet',
        debuggerTypes: ['Stylesheet'],
        browserTypes: ['stylesheet'],
    },
    {
        id: 'image',
        label: 'Image',
        debuggerTypes: ['Image'],
        browserTypes: ['image'],
    },
    {
        id: 'font',
        label: 'Font',
        debuggerTypes: ['Font'],
        browserTypes: ['font'],
    },
    {
        id: 'media',
        label: 'Media',
        debuggerTypes: ['Media'],
        browserTypes: ['media'],
    },
    {
        id: 'websocket',
        label: 'WebSocket',
        debuggerTypes: ['WebSocket'],
        browserTypes: ['websocket'],
    },
    {
        id: 'ping',
        label: 'Ping',
        debuggerTypes: ['Ping'],
        browserTypes: ['ping'],
    },
    {
        id: 'other',
        label: 'Other',
        debuggerTypes: ['Other'],
        browserTypes: ['other'],
    },
];
