import type { LiveListening } from '../../Live/LiveListening';
import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface SetLiveListeningCommand {
    type: typeof PANEL_COMMAND_TYPE.SetLiveListening;
    tabId: number;
    listening: LiveListening;
}
