import type { InspectionStatus } from "../Inspection/InspectionStatus";
import type { LiveSnapshot } from "../Live/LiveSnapshot";
import type { SearchMatch } from "../Search/SearchQuery";
import type { TimelineEntryDetail } from "../Timeline/TimelineEntryDetail";
import type { TimelineEntrySummary } from "../Timeline/TimelineEntrySummary";
import type { ClientExchangeResponse } from "./Commands/LogClientExchangeCommand";
import { PanelCommandType } from "./PanelCommandType";

export interface InspectTabResult {
    status: InspectionStatus;
    entries: TimelineEntrySummary[];
    live: LiveSnapshot;
}

export interface PanelCommandResults {
    [PanelCommandType.InspectTab]: InspectTabResult;
    [PanelCommandType.GetEntryDetail]: TimelineEntryDetail;
    [PanelCommandType.ClearTimeline]: void;
    [PanelCommandType.KeepAlive]: void;
    [PanelCommandType.SearchTimeline]: SearchMatch[];
    [PanelCommandType.LogClientExchange]: void;
    [PanelCommandType.GetTimelineDetails]: TimelineEntryDetail[];
    [PanelCommandType.SendClientRequest]: ClientExchangeResponse;
    [PanelCommandType.SendPostMessage]: void;
    [PanelCommandType.RemoveLiveChannels]: void;
    [PanelCommandType.SetLiveListening]: void;
}
