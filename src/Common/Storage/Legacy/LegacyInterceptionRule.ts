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
