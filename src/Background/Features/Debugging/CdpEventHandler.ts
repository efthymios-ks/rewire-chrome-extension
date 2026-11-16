import type { CdpEventName } from './CdpTypes/CdpEventName';
import type { CdpEventParams } from './CdpTypes/CdpEventParams';

export interface CdpEventHandler<TEventName extends CdpEventName> {
    readonly event: TEventName;
    handleAsync(
        tabId: number,
        params: CdpEventParams<TEventName>,
        sessionId: string | null,
    ): Promise<void>;
}
