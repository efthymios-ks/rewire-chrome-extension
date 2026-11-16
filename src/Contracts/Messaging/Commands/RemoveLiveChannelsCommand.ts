import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';

export interface RemoveLiveChannelsCommand {
    type: typeof PANEL_COMMAND_TYPE.RemoveLiveChannels;
    tabId: number;
    channelIds: string[];
}
