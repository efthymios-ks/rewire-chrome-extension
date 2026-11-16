import { Result } from '../../../Common/Results/Result';
import type { SetLiveListeningCommand } from '../../../Contracts/Messaging/Commands/SetLiveListeningCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { LiveListeningService } from '../../Features/Live/LiveListeningService';
import type { PanelEndpoint } from '../PanelEndpoint';

export class SetLiveListeningEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.SetLiveListening> {
    readonly commandType = PANEL_COMMAND_TYPE.SetLiveListening;

    private readonly _service: LiveListeningService;

    constructor(service: LiveListeningService) {
        this._service = service;
    }

    async handleAsync(command: SetLiveListeningCommand): Promise<Result<void>> {
        await this._service.setAsync(command.tabId, command.listening);

        return Result.done();
    }
}
