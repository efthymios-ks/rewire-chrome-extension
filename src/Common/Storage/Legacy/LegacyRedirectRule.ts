export interface LegacyRedirectRule {
    id: string;
    enabled: boolean;
    name: string;
    kind: number;
    source: string;
    target: string;
    strictParameters: boolean;
}
