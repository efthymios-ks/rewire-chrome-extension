import type { PanelCommandType } from "../PanelCommandType";

export interface RemoveLiveChannelsCommand {
    type: PanelCommandType.RemoveLiveChannels;
    tabId: number;
    channelIds: string[];
}
