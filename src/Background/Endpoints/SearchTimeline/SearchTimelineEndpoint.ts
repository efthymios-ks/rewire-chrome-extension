import type { Result } from "../../../Common/Results/Result";
import { TimelineSearch } from "../../../Common/Search/TimelineSearch";
import type { SearchTimelineCommand } from "../../../Contracts/Messaging/Commands/SearchTimelineCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { SearchMatch } from "../../../Contracts/Search/SearchQuery";
import type { ITimelineStore } from "../../Features/Capture/ITimelineStore";
import { TimelineRecordMapper } from "../../Features/Capture/TimelineRecordMapper";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class SearchTimelineEndpoint implements IPanelEndpoint<PanelCommandType.SearchTimeline> {
    readonly commandType = PanelCommandType.SearchTimeline;

    private readonly _timelineStore: ITimelineStore;

    constructor(timelineStore: ITimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handle(command: SearchTimelineCommand): Promise<Result<SearchMatch[]>> {
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
