import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface ClearTimelineCommand {
    type: typeof PANEL_COMMAND_TYPE.ClearTimeline;
    tabId: number;
}
