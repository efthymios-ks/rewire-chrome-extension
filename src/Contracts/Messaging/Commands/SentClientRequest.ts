import type { HeaderEntry } from '../../Timeline/HeaderEntry';

export interface SentClientRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    bodyBase64: string | null;
}
