import type { PanelCommandType } from "../PanelCommandType";

export interface SendPostMessageCommand {
    type: PanelCommandType.SendPostMessage;
    tabId: number;
    target: string;
    data: string;
}
