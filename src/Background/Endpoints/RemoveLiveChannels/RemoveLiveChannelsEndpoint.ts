import { Result } from "../../../Common/Results/Result";
import type { RemoveLiveChannelsCommand } from "../../../Contracts/Messaging/Commands/RemoveLiveChannelsCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { ILiveStore } from "../../Features/Live/LiveStore";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class RemoveLiveChannelsEndpoint implements IPanelEndpoint<PanelCommandType.RemoveLiveChannels> {
    readonly commandType = PanelCommandType.RemoveLiveChannels;

    private readonly _liveStore: ILiveStore;

    constructor(liveStore: ILiveStore) {
        this._liveStore = liveStore;
    }

    async handle(command: RemoveLiveChannelsCommand): Promise<Result<void>> {
        this._liveStore.removeChannels(command.tabId, command.channelIds);

        return Result.done();
    }
}
