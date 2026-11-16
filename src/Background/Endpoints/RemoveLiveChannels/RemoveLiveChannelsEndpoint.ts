import { Result } from '../../../Common/Results/Result';
import type { RemoveLiveChannelsCommand } from '../../../Contracts/Messaging/Commands/RemoveLiveChannelsCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { LiveStore } from '../../Features/Live/LiveStore';
import type { PanelEndpoint } from '../PanelEndpoint';

export class RemoveLiveChannelsEndpoint
    implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.RemoveLiveChannels> {
    readonly commandType = PANEL_COMMAND_TYPE.RemoveLiveChannels;

    private readonly _liveStore: LiveStore;

    constructor(liveStore: LiveStore) {
        this._liveStore = liveStore;
    }

    async handleAsync(command: RemoveLiveChannelsCommand): Promise<Result<void>> {
        this._liveStore.removeChannels(command.tabId, command.channelIds);

        return Result.done();
    }
}
