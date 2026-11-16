import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { ResponseDraft } from './ResponseDraft';

export function responseDraftOf(status: number, headers: HeaderEntry[]): ResponseDraft {
    return {
        status,
        headers,
        body: null,
        errorReason: null,
    };
}
