import type { PanelCommandType } from "../PanelCommandType";

export interface GetTimelineDetailsCommand {
    type: PanelCommandType.GetTimelineDetails;
    tabId: number;
}
