import type { Protocol } from "devtools-protocol";
import type { IDebuggerSessions } from "../Debugging/DebuggerSessions";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";

export class ChildSessionDetachedHandler implements ICdpEventHandler<"Target.detachedFromTarget"> {
    readonly event = "Target.detachedFromTarget";

    private readonly _sessions: IDebuggerSessions;

    constructor(sessions: IDebuggerSessions) {
        this._sessions = sessions;
    }

    async handle(tabId: number, params: Protocol.Target.DetachedFromTargetEvent): Promise<void> {
        this._sessions.removeChild(tabId, params.sessionId);
    }
}
