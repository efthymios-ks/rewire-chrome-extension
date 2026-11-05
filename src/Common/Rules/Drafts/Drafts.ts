import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";

export interface SyntheticResponse {
    status: number;
    headers: HeaderEntry[];
    body: string;
}

export interface RequestDraft {
    url: string;
    method: string;
    headers: HeaderEntry[];
    body: string | null;
    resourceType: string;
    response: SyntheticResponse | null;
}

export interface ResponseDraft {
    status: number;
    headers: HeaderEntry[];
    body: string | null;
    errorReason: string | null;
}

export interface MatchFacts {
    request: RequestDraft;
    response: ResponseDraft | null;
}
