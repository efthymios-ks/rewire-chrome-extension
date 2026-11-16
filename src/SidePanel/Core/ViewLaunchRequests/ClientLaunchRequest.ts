import type { RequestSnapshot } from '../../../Common/CodeGen/RequestSnapshot';

export interface ClientLaunchRequest {
    snapshot: RequestSnapshot;
    requestedAt: number;
}
