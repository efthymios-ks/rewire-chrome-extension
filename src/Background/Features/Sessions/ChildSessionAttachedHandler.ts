import type { Protocol } from 'devtools-protocol';
import type { Logger } from '../../../Common/Logging/Logger';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { DebuggerSessions } from '../Debugging/DebuggerSessions';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { SessionPreparer } from './SessionPreparer';

export interface ChildSessionAttachedHandlerDependencies {
    debuggerClient: DebuggerClient;
    sessions: DebuggerSessions;
    preparer: SessionPreparer;
    logger: Logger;
}

export class ChildSessionAttachedHandler implements CdpEventHandler<'Target.attachedToTarget'> {
    readonly event = 'Target.attachedToTarget';

    private readonly _dependencies: ChildSessionAttachedHandlerDependencies;

    constructor(dependencies: ChildSessionAttachedHandlerDependencies) {
        this._dependencies = dependencies;
    }

    async handleAsync(tabId: number, params: Protocol.Target.AttachedToTargetEvent): Promise<void> {
        const { debuggerClient, sessions, preparer, logger } = this._dependencies;
        sessions.addChild(tabId, params.sessionId);
        const prepared = await preparer.prepareAsync(tabId, params.sessionId);
        if (prepared.hasErrors) {
            logger.warn(`Capturing the iframe ${params.targetInfo.url} failed.`, prepared.error);
        }

        if (!params.waitingForDebugger) {
            return;
        }

        const resumed = await debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ params.sessionId,
            /* command: */ 'Runtime.runIfWaitingForDebugger',
        );
        if (resumed.hasErrors) {
            logger.warn(`Resuming the iframe ${params.targetInfo.url} failed.`, resumed.error);
        }
    }
}
