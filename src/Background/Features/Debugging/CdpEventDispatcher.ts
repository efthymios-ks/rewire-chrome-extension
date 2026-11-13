import { CdpRequestId } from "./CdpRequestId";
import type { CdpEventName, CdpEventParams } from "./CdpTypes";
import type { IDebuggerSessions } from "./DebuggerSessions";
import type { ICdpEventHandler } from "./ICdpEventHandler";

type UntypedHandler = (
    tabId: number,
    params: unknown,
    sessionId: string | null
) => Promise<void>;

export interface CdpEventSource {
    tabId?: number;
    sessionId?: string;
}

export class CdpEventDispatcher {
    private readonly _handlers = new Map<string, UntypedHandler[]>();
    private readonly _sessions: IDebuggerSessions;

    constructor(sessions: IDebuggerSessions) {
        this._sessions = sessions;
    }

    register<TEventName extends CdpEventName>(handler: ICdpEventHandler<TEventName>): this {
        const untyped: UntypedHandler = (
            tabId,
            params,
            sessionId
        ) => handler.handle(
            tabId,
            params as CdpEventParams<TEventName>,
            sessionId
        );
        this._handlers.set(
            handler.event,
            [
                ...this._handlers.get(handler.event) ?? [],
                untyped,
            ]
        );

        return this;
    }

    async dispatch(
        source: CdpEventSource,
        method: string,
        params: unknown
    ): Promise<void> {
        const { tabId } = source;
        if (tabId === undefined) {
            return;
        }

        const sessionId = source.sessionId ?? null;
        const requestId = CdpRequestId.of(params);
        if (sessionId !== null && requestId !== null) {
            this._sessions.remember(
                tabId,
                requestId,
                sessionId
            );
        }

        for (const handler of this._handlers.get(method) ?? []) {
            await handler(
                tabId,
                params,
                sessionId
            );
        }
    }
}
