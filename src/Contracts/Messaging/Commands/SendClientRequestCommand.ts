import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';
import type { SentClientRequest } from './SentClientRequest';

export interface SendClientRequestCommand {
    type: typeof PANEL_COMMAND_TYPE.SendClientRequest;
    request: SentClientRequest;
}
