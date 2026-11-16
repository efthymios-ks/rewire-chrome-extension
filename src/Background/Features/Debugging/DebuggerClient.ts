import type { Result } from '../../../Common/Results/Result';
import type { CdpCommandName } from './CdpTypes/CdpCommandName';
import type { CdpCommandParams } from './CdpTypes/CdpCommandParams';
import type { CdpCommandReturn } from './CdpTypes/CdpCommandReturn';

export interface DebuggerClient {
    attachAsync(tabId: number): Promise<Result<void>>;
    detachAsync(tabId: number): Promise<Result<void>>;
    sendAsync<TCommandName extends CdpCommandName>(
        tabId: number,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>>;
    sendToSessionAsync<TCommandName extends CdpCommandName>(
        tabId: number,
        sessionId: string | null,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>>;
}
