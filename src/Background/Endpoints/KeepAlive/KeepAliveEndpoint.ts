import { Result } from '../../../Common/Results/Result';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { PanelEndpoint } from '../PanelEndpoint';

export class KeepAliveEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.KeepAlive> {
    readonly commandType = PANEL_COMMAND_TYPE.KeepAlive;

    async handleAsync(): Promise<Result<void>> {
        return Result.done();
    }
}
