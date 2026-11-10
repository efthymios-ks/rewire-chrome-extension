import type { RequestSnapshot } from "../../Common/CodeGen/RequestSnapshot";

export interface ClientLaunchRequest {
    snapshot: RequestSnapshot;
    requestedAt: number;
}

export interface JwtLaunchRequest {
    token: string;
    requestedAt: number;
}
