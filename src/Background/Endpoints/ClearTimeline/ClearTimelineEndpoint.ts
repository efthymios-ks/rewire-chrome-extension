import { Result } from "../../../Common/Results/Result";
import type { ClearTimelineCommand } from "../../../Contracts/Messaging/Commands/ClearTimelineCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import { WorkerEventType } from "../../../Contracts/Messaging/WorkerEventType";
import type { ITimelineStore } from "../../Features/Capture/ITimelineStore";
import type { IPanelConnectionHub } from "../../Features/PanelConnections/PanelConnectionHub";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class ClearTimelineEndpoint implements IPanelEndpoint<PanelCommandType.ClearTimeline> {
    readonly commandType = PanelCommandType.ClearTimeline;

    private readonly _timelineStore: ITimelineStore;
    private readonly _connectionHub: IPanelConnectionHub;

    constructor(timelineStore: ITimelineStore, connectionHub: IPanelConnectionHub) {
        this._timelineStore = timelineStore;
        this._connectionHub = connectionHub;
    }

    async handle(command: ClearTimelineCommand): Promise<Result<void>> {
        this._timelineStore.clear(command.tabId);
        this._connectionHub.publishToTab(
            command.tabId,
            {
                type: WorkerEventType.TimelineCleared,
                tabId: command.tabId,
            }
        );

        return Result.done();
    }
}
