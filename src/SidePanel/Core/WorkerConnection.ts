import { Result } from '../../Common/Results/Result';
import type { PanelCommandOf } from '../../Contracts/Messaging/PanelCommand';
import type { PanelCommandResults } from '../../Contracts/Messaging/PanelCommandResults';
import { type PanelCommandType } from '../../Contracts/Messaging/PanelCommandType';
import type { WorkerEvent } from '../../Contracts/Messaging/WorkerEvent';

export interface WorkerConnection {
    sendAsync<TCommandType extends PanelCommandType>(
        command: PanelCommandOf<TCommandType>,
    ): Promise<Result<PanelCommandResults[TCommandType]>>;
    onEvent(listener: (event: WorkerEvent) => void): void;
    onReconnect(listener: () => void): void;
}
