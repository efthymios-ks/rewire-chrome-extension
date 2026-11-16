import { Result } from '../../../Common/Results/Result';
import type { ClearTimelineCommand } from '../../../Contracts/Messaging/Commands/ClearTimelineCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import type { TimelineStore } from '../../Features/Capture/TimelineStore';
import type { PanelConnectionHub } from '../../Features/PanelConnections/PanelConnectionHub';
import type { PanelEndpoint } from '../PanelEndpoint';

export class ClearTimelineEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.ClearTimeline> {
    readonly commandType = PANEL_COMMAND_TYPE.ClearTimeline;

    private readonly _timelineStore: TimelineStore;
    private readonly _connectionHub: PanelConnectionHub;

    constructor(timelineStore: TimelineStore, connectionHub: PanelConnectionHub) {
        this._timelineStore = timelineStore;
        this._connectionHub = connectionHub;
    }

    async handleAsync(command: ClearTimelineCommand): Promise<Result<void>> {
        this._timelineStore.clear(command.tabId);
        this._connectionHub.publishToTab(
            /* tabId: */ command.tabId,
            /* event: */ {
                type: WORKER_EVENT_TYPE.TimelineCleared,
                tabId: command.tabId,
            },
        );

        return Result.done();
    }
}
