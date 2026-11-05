export enum RedirectKind {
    Mirror = 1,
    Regex = 2,
}

export interface RedirectDefinition {
    kind: RedirectKind;
    source: string;
    target: string;
    strictParameters: boolean;
}
