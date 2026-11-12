import { Result } from "../../../Common/Results/Result";
import type { GetTimelineDetailsCommand } from "../../../Contracts/Messaging/Commands/GetTimelineDetailsCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import type { ITimelineStore } from "../../Features/Capture/ITimelineStore";
import { TimelineRecordMapper } from "../../Features/Capture/TimelineRecordMapper";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class GetTimelineDetailsEndpoint implements IPanelEndpoint<PanelCommandType.GetTimelineDetails> {
    readonly commandType = PanelCommandType.GetTimelineDetails;

    private readonly _timelineStore: ITimelineStore;

    constructor(timelineStore: ITimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handle(command: GetTimelineDetailsCommand): Promise<Result<TimelineEntryDetail[]>> {
        return Result.ok(this._timelineStore
            .records(command.tabId)
            .map(record => TimelineRecordMapper.toDetail(record)));
    }
}
