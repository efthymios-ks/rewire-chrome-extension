import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import { CdpRequestId } from "./CdpRequestId";
import type { CdpCommandName, CdpCommandParams, CdpCommandReturn } from "./CdpTypes";
import type { IDebuggerSessions } from "./DebuggerSessions";
import type { IDebuggerClient } from "./IDebuggerClient";

const ProtocolVersion = "1.3";

export class DebuggerClient implements IDebuggerClient {
    private readonly _sessions: IDebuggerSessions;

    constructor(sessions: IDebuggerSessions) {
        this._sessions = sessions;
    }

    async attach(tabId: number): Promise<Result<void>> {
        try {
            await chrome.debugger.attach(
                {
                    tabId,
                },
                ProtocolVersion
            );

            return Result.done();
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }

    async detach(tabId: number): Promise<Result<void>> {
        try {
            await chrome.debugger.detach({
                tabId,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }

    async send<TCommandName extends CdpCommandName>(
        tabId: number,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        const [commandParams] = params as unknown[];
        const requestId = CdpRequestId.of(commandParams);
        const sessionId = requestId === null ? undefined : this._sessions.sessionOf(tabId, requestId);

        return this.sendToSession(
            tabId,
            sessionId ?? null,
            command,
            ...params
        );
    }

    async sendToSession<TCommandName extends CdpCommandName>(
        tabId: number,
        sessionId: string | null,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        const [commandParams] = params as unknown[];
        const target: chrome.debugger.DebuggerSession = sessionId === null
            ? {
                tabId,
            }
            : {
                tabId,
                sessionId,
            };
        try {
            const response = await chrome.debugger.sendCommand(
                target,
                command,
                commandParams as Record<string, unknown> | undefined
            );

            return Result.ok(response as CdpCommandReturn<TCommandName>);
        } catch (error) {
            return Result.fail(`${command} failed: ${ErrorText.of(error)}`);
        }
    }
}
