import type { PanelCommandType } from "../PanelCommandType";

export interface InspectTabCommand {
    type: PanelCommandType.InspectTab;
    tabId: number;
}
