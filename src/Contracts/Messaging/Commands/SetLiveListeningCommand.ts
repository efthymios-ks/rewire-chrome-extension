import type { LiveListening } from "../../Live/LiveListening";
import type { PanelCommandType } from "../PanelCommandType";

export interface SetLiveListeningCommand {
    type: PanelCommandType.SetLiveListening;
    tabId: number;
    listening: LiveListening;
}
