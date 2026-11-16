import { Result } from '../../../Common/Results/Result';
import type { GetEntryDetailCommand } from '../../../Contracts/Messaging/Commands/GetEntryDetailCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import type { TimelineStore } from '../../Features/Capture/TimelineStore';
import { TimelineRecordMapper } from '../../Features/Capture/TimelineRecordMapper';
import type { PanelEndpoint } from '../PanelEndpoint';

export class GetEntryDetailEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.GetEntryDetail> {
    readonly commandType = PANEL_COMMAND_TYPE.GetEntryDetail;

    private readonly _timelineStore: TimelineStore;

    constructor(timelineStore: TimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handleAsync(command: GetEntryDetailCommand): Promise<Result<TimelineEntryDetail>> {
        const record = this._timelineStore.get(command.tabId, command.entryId);
        if (record == null) {
            return Result.fail('The request is no longer in the timeline.');
        }

        return Result.ok(TimelineRecordMapper.toDetail(record));
    }
}
