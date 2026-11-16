import type { SearchQuery } from '../../Search/SearchQuery';
import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface SearchTimelineCommand {
    type: typeof PANEL_COMMAND_TYPE.SearchTimeline;
    tabId: number;
    query: SearchQuery;
}
