import type { Result } from "../../../Common/Results/Result";
import type { CdpCommandName, CdpCommandParams, CdpCommandReturn } from "../Debugging/CdpTypes";

export interface IPanelTargetClient {
    findPanelTarget(): Promise<string | null>;
    attach(targetId: string): Promise<Result<void>>;
    send<TCommandName extends CdpCommandName>(
        targetId: string,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>>;
}
