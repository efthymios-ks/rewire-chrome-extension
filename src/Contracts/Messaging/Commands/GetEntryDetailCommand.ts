import type { PanelCommandType } from "../PanelCommandType";

export interface GetEntryDetailCommand {
    type: PanelCommandType.GetEntryDetail;
    tabId: number;
    entryId: string;
}
