import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface SendPostMessageCommand {
    type: typeof PANEL_COMMAND_TYPE.SendPostMessage;
    tabId: number;
    target: string;
    data: string;
}
