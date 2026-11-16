import { CdpRequestId } from './CdpRequestId';
import type { CdpEventName } from './CdpTypes/CdpEventName';
import type { CdpEventParams } from './CdpTypes/CdpEventParams';
import type { DebuggerSessions } from './DebuggerSessions';
import type { CdpEventHandler } from './CdpEventHandler';

type UntypedHandler = (
    tabId: number,
    params: unknown,
    sessionId: string | null,
) => Promise<void>;

export interface CdpEventSource {
    tabId?: number;
    sessionId?: string;
}

export class CdpEventDispatcher {
    private readonly _handlers = new Map<string, UntypedHandler[]>();
    private readonly _sessions: DebuggerSessions;

    constructor(sessions: DebuggerSessions) {
        this._sessions = sessions;
    }

    register<TEventName extends CdpEventName>(handler: CdpEventHandler<TEventName>): this {
        const untypedAsync: UntypedHandler = (
            tabId,
            params,
            sessionId,
        ) => handler.handleAsync(
            /* tabId: */ tabId,
            /* params: */ params as CdpEventParams<TEventName>,
            /* sessionId: */ sessionId,
        );
        this._handlers.set(
            /* key: */ handler.event,
            /* value: */ [
                ...this._handlers.get(handler.event) ?? [],
                untypedAsync,
            ],
        );

        return this;
    }

    async dispatchAsync(
        source: CdpEventSource,
        method: string,
        params: unknown,
    ): Promise<void> {
        const { tabId } = source;
        if (tabId == null) {
            return;
        }

        const sessionId = source.sessionId ?? null;
        const requestId = CdpRequestId.of(params);
        if (sessionId != null && requestId != null) {
            this._sessions.remember({ tabId, requestId, sessionId });
        }

        for (const handler of this._handlers.get(method) ?? []) {
            await handler(
                /* tabId: */ tabId,
                /* params: */ params,
                /* sessionId: */ sessionId,
            );
        }
    }
}
