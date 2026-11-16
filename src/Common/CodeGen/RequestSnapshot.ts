import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';

export interface RequestSnapshot {
    method: string;
    url: string;
    headers: HeaderEntry[];
    body: string | null;
}
