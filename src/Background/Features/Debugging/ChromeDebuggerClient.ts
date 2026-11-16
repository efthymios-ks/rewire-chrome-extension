import { Result } from '../../../Common/Results/Result';
import { CdpRequestId } from './CdpRequestId';
import type { CdpCommandName } from './CdpTypes/CdpCommandName';
import type { CdpCommandParams } from './CdpTypes/CdpCommandParams';
import type { CdpCommandReturn } from './CdpTypes/CdpCommandReturn';
import { ChromeDebuggee } from './ChromeDebuggee';
import type { DebuggerSessions } from './DebuggerSessions';
import type { DebuggerClient } from './DebuggerClient';

export class ChromeDebuggerClient implements DebuggerClient {
    private readonly _sessions: DebuggerSessions;

    constructor(sessions: DebuggerSessions) {
        this._sessions = sessions;
    }

    async attachAsync(tabId: number): Promise<Result<void>> {
        return ChromeDebuggee.attachAsync({
            tabId,
        });
    }

    detachAsync(tabId: number): Promise<Result<void>> {
        return Result.attemptAsync(() => chrome.debugger.detach({
            tabId,
        }));
    }

    async sendAsync<TCommandName extends CdpCommandName>(
        tabId: number,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        const [commandParams] = params as unknown[];
        const requestId = CdpRequestId.of(commandParams);
        const sessionId = requestId == null ? undefined : this._sessions.sessionOf(tabId, requestId);

        return this.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId ?? null,
            /* command: */ command,
            /* params: */ ...params,
        );
    }

    async sendToSessionAsync<TCommandName extends CdpCommandName>(
        tabId: number,
        sessionId: string | null,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        const target: chrome.debugger.DebuggerSession = sessionId == null
            ? {
                tabId,
            }
            : {
                tabId,
                sessionId,
            };

        return ChromeDebuggee.sendCommandAsync(
            /* target: */ target,
            /* command: */ command,
            /* params: */ ...params,
        );
    }
}
