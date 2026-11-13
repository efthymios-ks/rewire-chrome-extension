import type { Protocol } from "devtools-protocol";
import type { ILogger } from "../../../Common/Logging/ILogger";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import type { IDebuggerSessions } from "../Debugging/DebuggerSessions";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ISessionPreparer } from "./SessionPreparer";

export interface ChildSessionAttachedDependencies {
    debuggerClient: IDebuggerClient;
    sessions: IDebuggerSessions;
    preparer: ISessionPreparer;
    logger: ILogger;
}

export class ChildSessionAttachedHandler implements ICdpEventHandler<"Target.attachedToTarget"> {
    readonly event = "Target.attachedToTarget";

    private readonly _dependencies: ChildSessionAttachedDependencies;

    constructor(dependencies: ChildSessionAttachedDependencies) {
        this._dependencies = dependencies;
    }

    async handle(tabId: number, params: Protocol.Target.AttachedToTargetEvent): Promise<void> {
        const { debuggerClient, sessions, preparer, logger } = this._dependencies;
        sessions.addChild(tabId, params.sessionId);
        const prepared = await preparer.prepare(tabId, params.sessionId);
        if (prepared.hasErrors) {
            logger.warn(`Capturing the iframe ${params.targetInfo.url} failed.`, prepared.error);
        }

        if (!params.waitingForDebugger) {
            return;
        }

        const resumed = await debuggerClient.sendToSession(
            tabId,
            params.sessionId,
            "Runtime.runIfWaitingForDebugger"
        );
        if (resumed.hasErrors) {
            logger.warn(`Resuming the iframe ${params.targetInfo.url} failed.`, resumed.error);
        }
    }
}
