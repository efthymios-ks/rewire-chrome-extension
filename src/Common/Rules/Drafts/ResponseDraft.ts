import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';

export interface ResponseDraft {
    status: number;
    headers: HeaderEntry[];
    body: string | null;
    errorReason: string | null;
}
