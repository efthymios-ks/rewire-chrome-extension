import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface KeepAliveCommand {
    type: typeof PANEL_COMMAND_TYPE.KeepAlive;
}
