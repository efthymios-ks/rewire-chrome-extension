import type { HeaderEntry } from '../../Timeline/HeaderEntry';

export interface ClientExchangeResponse {
    status: number;
    statusText: string;
    headers: HeaderEntry[];
    body: string;
    durationInMilliseconds: number;
}
