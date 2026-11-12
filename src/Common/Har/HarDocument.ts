export interface HarNameValue {
    name: string;
    value: string;
}

export interface HarCookie {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    expires?: string;
    httpOnly?: boolean;
    secure?: boolean;
}

export interface HarPostData {
    mimeType: string;
    text: string;
}

export interface HarRequest {
    method: string;
    url: string;
    httpVersion: string;
    cookies: HarCookie[];
    headers: HarNameValue[];
    queryString: HarNameValue[];
    postData?: HarPostData;
    headersSize: number;
    bodySize: number;
}

export interface HarContent {
    size: number;
    mimeType: string;
    text?: string;
    comment?: string;
}

export interface HarResponse {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: HarCookie[];
    headers: HarNameValue[];
    content: HarContent;
    redirectURL: string;
    headersSize: number;
    bodySize: number;
}

export interface HarTimings {
    send: number;
    wait: number;
    receive: number;
}

export interface HarEntry {
    startedDateTime: string;
    time: number;
    request: HarRequest;
    response: HarResponse;
    cache: Record<string, never>;
    timings: HarTimings;
    _resourceType: string;
    _error?: string;
}

export interface HarCreator {
    name: string;
    version: string;
}

export interface HarLog {
    version: string;
    creator: HarCreator;
    pages: never[];
    entries: HarEntry[];
}

export interface HarDocument {
    log: HarLog;
}
