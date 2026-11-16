import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface GetTimelineDetailsCommand {
    type: typeof PANEL_COMMAND_TYPE.GetTimelineDetails;
    tabId: number;
}
