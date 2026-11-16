import type { Result } from '../../../Common/Results/Result';
import { TimelineSearch } from '../../../Common/Search/TimelineSearch';
import type { SearchTimelineCommand } from '../../../Contracts/Messaging/Commands/SearchTimelineCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { SearchMatch } from '../../../Contracts/Search/SearchMatch';
import type { TimelineStore } from '../../Features/Capture/TimelineStore';
import { TimelineRecordMapper } from '../../Features/Capture/TimelineRecordMapper';
import type { PanelEndpoint } from '../PanelEndpoint';

export class SearchTimelineEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.SearchTimeline> {
    readonly commandType = PANEL_COMMAND_TYPE.SearchTimeline;

    private readonly _timelineStore: TimelineStore;

    constructor(timelineStore: TimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handleAsync(command: SearchTimelineCommand): Promise<Result<SearchMatch[]>> {
        const entries = this._timelineStore
            .records(command.tabId)
            .map(record => TimelineRecordMapper.toDetail(record))
            .map(detail => ({
                id: detail.summary.id,
                url: detail.summary.url,
                requestBody: detail.requestBody,
                responseBody: detail.responseBody,
                requestHeaders: detail.requestHeaders,
                responseHeaders: detail.responseHeaders,
            }));

        return TimelineSearch.search(entries, command.query);
    }
}
