import type { InspectionStatus } from "../../Contracts/Inspection/InspectionStatus";
import type { RuleSyncReport } from "../../Contracts/RuleSync/RuleSyncReport";
import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import type { TimelineEntryDetail } from "../../Contracts/Timeline/TimelineEntryDetail";
import type { TimelineEntrySummary } from "../../Contracts/Timeline/TimelineEntrySummary";
import type { ContentFilterId } from "./ContentFilterId";
import type { InspectedTab } from "./InspectedTab";
import type { InspectorTabId } from "./InspectorTabId";
import type { Notice } from "./Notice";
import type { PanelTheme } from "./PanelTheme";
import type { RuleEditRequest } from "./RuleEditRequest";
import type { TrafficLayout } from "./TrafficLayout";
import type { TrafficSearchState } from "./TrafficSearchState";
import type { ViewId } from "./ViewId";

export interface PanelState {
    settings: PanelSettings;
    inspectedTab: InspectedTab | null;
    inspection: InspectionStatus;
    entries: TimelineEntrySummary[];
    selectedEntryId: string | null;
    selectedEntryDetail: TimelineEntryDetail | null;
    detailVersion: number;
    detailError: string | null;
    activeView: ViewId;
    inspectorTab: InspectorTabId;
    contentFilter: ContentFilterId;
    trafficLayout: TrafficLayout;
    search: TrafficSearchState;
    ruleSyncReport: RuleSyncReport | null;
    ruleHits: Record<string, number>;
    ruleEditRequest: RuleEditRequest | null;
    notice: Notice | null;
    theme: PanelTheme;
}
