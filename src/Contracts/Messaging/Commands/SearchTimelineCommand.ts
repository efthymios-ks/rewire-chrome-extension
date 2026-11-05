import type { SearchQuery } from "../../Search/SearchQuery";
import type { PanelCommandType } from "../PanelCommandType";

export interface SearchTimelineCommand {
    type: PanelCommandType.SearchTimeline;
    tabId: number;
    query: SearchQuery;
}
