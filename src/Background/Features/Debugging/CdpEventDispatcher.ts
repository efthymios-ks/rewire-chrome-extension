import type { CdpEventName, CdpEventParams } from "./CdpTypes";
import type { ICdpEventHandler } from "./ICdpEventHandler";

type UntypedHandler = (tabId: number, params: unknown) => Promise<void>;

export class CdpEventDispatcher {
    private readonly _handlers = new Map<string, UntypedHandler>();

    register<TEventName extends CdpEventName>(handler: ICdpEventHandler<TEventName>): this {
        this._handlers.set(
            handler.event,
            (tabId, params) => handler.handle(tabId, params as CdpEventParams<TEventName>)
        );

        return this;
    }

    async dispatch(
        tabId: number | undefined,
        method: string,
        params: unknown
    ): Promise<void> {
        if (tabId === undefined) {
            return;
        }

        const handler = this._handlers.get(method);
        if (handler === undefined) {
            return;
        }

        await handler(tabId, params);
    }
}
