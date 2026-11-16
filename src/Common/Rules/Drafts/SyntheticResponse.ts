import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';

export interface SyntheticResponse {
    status: number;
    headers: HeaderEntry[];
    body: string;
}
