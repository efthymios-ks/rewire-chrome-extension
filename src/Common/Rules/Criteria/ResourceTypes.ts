type DnrResourceType = `${chrome.declarativeNetRequest.ResourceType}`;

export interface ResourceTypeOption {
    id: string;
    label: string;
    debuggerTypes: string[];
    browserTypes: DnrResourceType[];
}

export const ResourceTypeOptions: ResourceTypeOption[] = [
    {
        id: "fetch",
        label: "Fetch",
        debuggerTypes: [
            "Fetch",
            "XHR",
        ],
        browserTypes: ["xmlhttprequest"],
    },
    {
        id: "xhr",
        label: "XHR",
        debuggerTypes: [
            "XHR",
            "Fetch",
        ],
        browserTypes: ["xmlhttprequest"],
    },
    {
        id: "document",
        label: "Document",
        debuggerTypes: ["Document"],
        browserTypes: [
            "main_frame",
            "sub_frame",
        ],
    },
    {
        id: "script",
        label: "Script",
        debuggerTypes: ["Script"],
        browserTypes: ["script"],
    },
    {
        id: "stylesheet",
        label: "Stylesheet",
        debuggerTypes: ["Stylesheet"],
        browserTypes: ["stylesheet"],
    },
    {
        id: "image",
        label: "Image",
        debuggerTypes: ["Image"],
        browserTypes: ["image"],
    },
    {
        id: "font",
        label: "Font",
        debuggerTypes: ["Font"],
        browserTypes: ["font"],
    },
    {
        id: "media",
        label: "Media",
        debuggerTypes: ["Media"],
        browserTypes: ["media"],
    },
    {
        id: "websocket",
        label: "WebSocket",
        debuggerTypes: ["WebSocket"],
        browserTypes: ["websocket"],
    },
    {
        id: "ping",
        label: "Ping",
        debuggerTypes: ["Ping"],
        browserTypes: ["ping"],
    },
    {
        id: "other",
        label: "Other",
        debuggerTypes: ["Other"],
        browserTypes: ["other"],
    },
];

export const DefaultResourceTypes = {
    Browser: [
        "xmlhttprequest",
        "other",
        "main_frame",
        "sub_frame",
    ] as DnrResourceType[],
    Debugger: [
        "XHR",
        "Fetch",
        "Document",
    ],
} as const;

export const ResourceTypes = {
    idsOfDebuggerType(debuggerType: string): string[] {
        const ids = ResourceTypeOptions
            .filter(option => option.debuggerTypes.includes(debuggerType))
            .map(option => option.id);

        return ids.length === 0 ? [debuggerType.toLowerCase()] : ids;
    },

    browserTypesOf(ids: string[]): DnrResourceType[] {
        const types = ids.flatMap(id => ResourceTypeOptions.find(option => option.id === id)?.browserTypes ?? []);

        return [...new Set(types)];
    },

    debuggerTypesOf(ids: string[]): string[] {
        const types = ids.flatMap(id => ResourceTypeOptions.find(option => option.id === id)?.debuggerTypes ?? []);

        return [...new Set(types)];
    },
};
