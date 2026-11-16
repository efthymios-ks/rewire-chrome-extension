import type { Protocol } from 'devtools-protocol';
import type { DebuggerSessions } from '../Debugging/DebuggerSessions';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';

export class ChildSessionDetachedHandler implements CdpEventHandler<'Target.detachedFromTarget'> {
    readonly event = 'Target.detachedFromTarget';

    private readonly _sessions: DebuggerSessions;

    constructor(sessions: DebuggerSessions) {
        this._sessions = sessions;
    }

    async handleAsync(tabId: number, params: Protocol.Target.DetachedFromTargetEvent): Promise<void> {
        this._sessions.removeChild(tabId, params.sessionId);
    }
}
