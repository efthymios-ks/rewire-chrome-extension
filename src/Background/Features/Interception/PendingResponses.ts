import type { RequestDraft } from '../../../Common/Rules/Drafts/RequestDraft';
import type { ResponseCandidate } from '../../../Common/Rules/Engine/ResponseCandidate';
import { BoundedMap } from '../../Core/BoundedMap';
import { TIMELINE_LIMITS } from '../Capture/TimelineLimits';

export interface PendingResponse {
    request: RequestDraft;
    candidates: ResponseCandidate[];
}

export class PendingResponses {
    private readonly _pending = new BoundedMap<string, PendingResponse>(
        /* maxSize: */ TIMELINE_LIMITS.MaxPendingInterceptions,
    );

    add(interceptionId: string, pending: PendingResponse): void {
        this._pending.set(interceptionId, pending);
    }

    take(interceptionId: string): PendingResponse | null {
        const pending = this._pending.get(interceptionId) ?? null;
        this._pending.delete(interceptionId);

        return pending;
    }
}
