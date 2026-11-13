import { Result } from "../../../Common/Results/Result";
import type { SetLiveListeningCommand } from "../../../Contracts/Messaging/Commands/SetLiveListeningCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { ILiveListeningService } from "../../Features/Live/LiveListeningService";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class SetLiveListeningEndpoint implements IPanelEndpoint<PanelCommandType.SetLiveListening> {
    readonly commandType = PanelCommandType.SetLiveListening;

    private readonly _service: ILiveListeningService;

    constructor(service: ILiveListeningService) {
        this._service = service;
    }

    async handle(command: SetLiveListeningCommand): Promise<Result<void>> {
        await this._service.set(command.tabId, command.listening);

        return Result.done();
    }
}
