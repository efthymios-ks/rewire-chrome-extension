import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface GetEntryDetailCommand {
    type: typeof PANEL_COMMAND_TYPE.GetEntryDetail;
    tabId: number;
    entryId: string;
}
