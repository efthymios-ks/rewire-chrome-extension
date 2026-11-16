import type { LiveListeningKind } from '../../../Contracts/Live/LiveListening';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { CdpEventName } from '../Debugging/CdpTypes/CdpEventName';
import type { CdpEventParams } from '../Debugging/CdpTypes/CdpEventParams';
import type { LiveListeningRegistry } from './LiveListeningRegistry';

export interface ListeningGateOptions<TEventName extends CdpEventName> {
    inner: CdpEventHandler<TEventName>;
    registry: LiveListeningRegistry;
    kind: LiveListeningKind;
}

export class ListeningGate<TEventName extends CdpEventName> implements CdpEventHandler<TEventName> {
    readonly event: TEventName;

    private readonly _inner: CdpEventHandler<TEventName>;
    private readonly _registry: LiveListeningRegistry;
    private readonly _kind: LiveListeningKind;

    constructor({ inner, registry, kind }: ListeningGateOptions<TEventName>) {
        this.event = inner.event;
        this._inner = inner;
        this._registry = registry;
        this._kind = kind;
    }

    async handleAsync(
        tabId: number,
        params: CdpEventParams<TEventName>,
        sessionId: string | null,
    ): Promise<void> {
        if (!this._registry.of(tabId)[this._kind]) {
            return;
        }

        await this._inner.handleAsync(
            /* tabId: */ tabId,
            /* params: */ params,
            /* sessionId: */ sessionId,
        );
    }
}
