import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface InspectTabCommand {
    type: typeof PANEL_COMMAND_TYPE.InspectTab;
    tabId: number;
}
