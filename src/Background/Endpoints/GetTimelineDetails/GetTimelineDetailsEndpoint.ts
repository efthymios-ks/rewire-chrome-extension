import { Result } from '../../../Common/Results/Result';
import type { GetTimelineDetailsCommand } from '../../../Contracts/Messaging/Commands/GetTimelineDetailsCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import type { TimelineStore } from '../../Features/Capture/TimelineStore';
import { TimelineRecordMapper } from '../../Features/Capture/TimelineRecordMapper';
import type { PanelEndpoint } from '../PanelEndpoint';

export class GetTimelineDetailsEndpoint
    implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.GetTimelineDetails> {
    readonly commandType = PANEL_COMMAND_TYPE.GetTimelineDetails;

    private readonly _timelineStore: TimelineStore;

    constructor(timelineStore: TimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handleAsync(command: GetTimelineDetailsCommand): Promise<Result<TimelineEntryDetail[]>> {
        return Result.ok(this._timelineStore
            .records(command.tabId)
            .map(record => TimelineRecordMapper.toDetail(record)));
    }
}
