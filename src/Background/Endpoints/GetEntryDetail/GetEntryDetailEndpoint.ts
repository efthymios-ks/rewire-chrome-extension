import { Result } from "../../../Common/Results/Result";
import type { GetEntryDetailCommand } from "../../../Contracts/Messaging/Commands/GetEntryDetailCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import type { ITimelineStore } from "../../Features/Capture/ITimelineStore";
import { TimelineRecordMapper } from "../../Features/Capture/TimelineRecordMapper";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class GetEntryDetailEndpoint implements IPanelEndpoint<PanelCommandType.GetEntryDetail> {
    readonly commandType = PanelCommandType.GetEntryDetail;

    private readonly _timelineStore: ITimelineStore;

    constructor(timelineStore: ITimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handle(command: GetEntryDetailCommand): Promise<Result<TimelineEntryDetail>> {
        const record = this._timelineStore.get(command.tabId, command.entryId);
        if (record === undefined) {
            return Result.fail("The request is no longer in the timeline.");
        }

        return Result.ok(TimelineRecordMapper.toDetail(record));
    }
}
