import type { Result } from '../../../Common/Results/Result';
import type { CdpCommandName } from '../Debugging/CdpTypes/CdpCommandName';
import type { CdpCommandParams } from '../Debugging/CdpTypes/CdpCommandParams';
import type { CdpCommandReturn } from '../Debugging/CdpTypes/CdpCommandReturn';

export interface PanelTargetClient {
    findPanelTargetAsync(): Promise<Result<string | null>>;
    attachAsync(targetId: string): Promise<Result<void>>;
    sendAsync<TCommandName extends CdpCommandName>(
        targetId: string,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>>;
}
