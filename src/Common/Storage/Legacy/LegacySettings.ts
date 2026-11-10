export const LegacyResponseSource = {
    Mock: 1,
    Live: 2,
} as const;

export const LegacyRedirectKind = {
    Mirror: 1,
    Regex: 2,
} as const;

export interface LegacyInterceptionRule {
    id: string;
    enabled: boolean;
    method: string;
    urlPattern: string;
    responseSource: number;
    statusCodeOverride: number | null;
    mockContentType: string;
    mockBody: string;
    delayInMilliseconds: number;
}

export interface LegacyRedirectRule {
    id: string;
    enabled: boolean;
    name: string;
    kind: number;
    source: string;
    target: string;
    strictParameters: boolean;
}

export interface LegacyHeaderInjection {
    id: string;
    enabled: boolean;
    domains: string[];
    headerName: string;
    headerValue: string;
}

export interface LegacyCorsSettings {
    enabled: boolean;
    domains: string[];
    allowedOrigin: string;
    allowedHeaders: string;
}

export interface LegacySettings {
    interceptionRules?: LegacyInterceptionRule[];
    redirectRules?: LegacyRedirectRule[];
    headerInjections?: LegacyHeaderInjection[];
    cors?: LegacyCorsSettings;
    regexTesterSamples?: string[];
}
