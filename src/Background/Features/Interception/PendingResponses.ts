import type { RequestDraft } from "../../../Common/Rules/Drafts/Drafts";
import type { ResponseCandidate } from "../../../Common/Rules/Engine/RulePipeline";
import { TimelineLimits } from "../Capture/TimelineLimits";

export interface PendingResponse {
    request: RequestDraft;
    candidates: ResponseCandidate[];
}

export class PendingResponses {
    private readonly _pending = new Map<string, PendingResponse>();

    add(interceptionId: string, pending: PendingResponse): void {
        this._pending.set(interceptionId, pending);
        while (this._pending.size > TimelineLimits.MaxPendingInterceptions) {
            const oldestKey = this._pending
                .keys()
                .next()
                .value;
            if (oldestKey === undefined) {
                return;
            }

            this._pending.delete(oldestKey);
        }
    }

    take(interceptionId: string): PendingResponse | null {
        const pending = this._pending.get(interceptionId) ?? null;
        this._pending.delete(interceptionId);

        return pending;
    }
}
