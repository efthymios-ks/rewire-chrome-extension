import type { PanelCommandType } from "../PanelCommandType";

export interface ClearTimelineCommand {
    type: PanelCommandType.ClearTimeline;
    tabId: number;
}
