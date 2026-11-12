import { InspectionState } from "../../Contracts/Inspection/InspectionState";
import { DefaultPanelSettings } from "../../Contracts/Settings/DefaultPanelSettings";
import { ContentFilterId } from "./ContentFilterId";
import { InspectorTabId } from "./InspectorTabId";
import type { PanelState } from "./PanelState";
import { PanelThemes } from "./PanelTheme";
import { TrafficLayout } from "./TrafficLayout";
import { ViewId } from "./ViewId";

export const PanelStateFactory = {
    initial(): PanelState {
        return {
            settings: DefaultPanelSettings,
            inspectedTab: null,
            inspection: {
                state: InspectionState.Idle,
                message: "",
            },
            entries: [],
            selectedEntryId: null,
            selectionCount: 0,
            selectedEntryDetail: null,
            detailVersion: 0,
            detailError: null,
            activeView: ViewId.Traffic,
            inspectorTab: InspectorTabId.General,
            contentFilter: ContentFilterId.All,
            trafficLayout: TrafficLayout.List,
            search: {
                query: {
                    text: "",
                    isRegex: false,
                },
                matches: [],
                activeIndex: -1,
                error: null,
            },
            ruleSyncReport: null,
            ruleHits: {},
            capturedVariables: [],
            ruleEditRequest: null,
            clientLaunch: null,
            jwtLaunch: null,
            notice: null,
            theme: PanelThemes.System,
        };
    },
};
