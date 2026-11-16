import type { SearchMatch } from '../Search/SearchMatch';
import type { TimelineEntryDetail } from '../Timeline/TimelineEntryDetail';
import type { ClientExchangeResponse } from './Commands/ClientExchangeResponse';
import type { InspectTabResult } from './InspectTabResult';
import { PANEL_COMMAND_TYPE } from './PanelCommandType';

export interface PanelCommandResults {
    [PANEL_COMMAND_TYPE.InspectTab]: InspectTabResult;
    [PANEL_COMMAND_TYPE.GetEntryDetail]: TimelineEntryDetail;
    [PANEL_COMMAND_TYPE.ClearTimeline]: void;
    [PANEL_COMMAND_TYPE.KeepAlive]: void;
    [PANEL_COMMAND_TYPE.SearchTimeline]: SearchMatch[];
    [PANEL_COMMAND_TYPE.LogClientExchange]: void;
    [PANEL_COMMAND_TYPE.GetTimelineDetails]: TimelineEntryDetail[];
    [PANEL_COMMAND_TYPE.SendClientRequest]: ClientExchangeResponse;
    [PANEL_COMMAND_TYPE.SendPostMessage]: void;
    [PANEL_COMMAND_TYPE.RemoveLiveChannels]: void;
    [PANEL_COMMAND_TYPE.SetLiveListening]: void;
}
