import type { CdpEventName, CdpEventParams } from "./CdpTypes";

export interface ICdpEventHandler<TEventName extends CdpEventName> {
    readonly event: TEventName;
    handle(
        tabId: number,
        params: CdpEventParams<TEventName>,
        sessionId: string | null
    ): Promise<void>;
}
