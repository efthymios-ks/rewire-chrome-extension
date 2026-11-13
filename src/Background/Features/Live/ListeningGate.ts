import type { LiveListeningKind } from "../../../Contracts/Live/LiveListening";
import type { CdpEventName, CdpEventParams } from "../Debugging/CdpTypes";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ILiveListeningRegistry } from "./LiveListeningRegistry";

export class ListeningGate<TEventName extends CdpEventName> implements ICdpEventHandler<TEventName> {
    readonly event: TEventName;

    private readonly _inner: ICdpEventHandler<TEventName>;
    private readonly _registry: ILiveListeningRegistry;
    private readonly _kind: LiveListeningKind;

    constructor(
        inner: ICdpEventHandler<TEventName>,
        registry: ILiveListeningRegistry,
        kind: LiveListeningKind
    ) {
        this.event = inner.event;
        this._inner = inner;
        this._registry = registry;
        this._kind = kind;
    }

    async handle(
        tabId: number,
        params: CdpEventParams<TEventName>,
        sessionId: string | null
    ): Promise<void> {
        if (!this._registry.of(tabId)[this._kind]) {
            return;
        }

        await this._inner.handle(
            tabId,
            params,
            sessionId
        );
    }
}
