import type { Result } from "../../../Common/Results/Result";
import type { CdpCommandName, CdpCommandParams, CdpCommandReturn } from "./CdpTypes";

export interface IDebuggerClient {
    attach(tabId: number): Promise<Result<void>>;
    detach(tabId: number): Promise<Result<void>>;
    send<TCommandName extends CdpCommandName>(
        tabId: number,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>>;
    sendToSession<TCommandName extends CdpCommandName>(
        tabId: number,
        sessionId: string | null,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>>;
}
