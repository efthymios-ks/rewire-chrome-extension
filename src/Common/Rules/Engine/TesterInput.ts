import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';

export interface TesterResponse {
    status: number;
    headers: HeaderEntry[];
    body: string;
}

export interface TesterInput {
    url: string;
    method: string;
    headers: HeaderEntry[];
    body: string | null;
    resourceType: string;
    response: TesterResponse | null;
}
