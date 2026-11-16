import { INSPECTION_STATE } from '../../Contracts/Inspection/InspectionState';
import { NO_LIVE_LISTENING } from '../../Contracts/Live/NoLiveListening';
import { SEARCH_SCOPES } from '../../Contracts/Search/SearchScope';
import { DEFAULT_PANEL_SETTINGS } from '../../Contracts/Settings/DefaultPanelSettings';
import { CONTENT_FILTER_ID } from './ContentFilterId';
import { FRAME_FILTERS } from './FrameFilters';
import { INSPECTOR_TAB_ID } from './InspectorTabId';
import type { PanelState } from './PanelState';
import { PANEL_THEMES } from './PanelTheme';
import { TRAFFIC_LAYOUT } from './TrafficLayout';
import { VIEW_ID } from './ViewId';

export const PanelStateFactory = {
    initial(): PanelState {
        return {
            settings: DEFAULT_PANEL_SETTINGS,
            inspectedTab: null,
            inspection: {
                state: INSPECTION_STATE.Idle,
                message: '',
            },
            entries: [],
            live: {
                channels: [],
                messages: [],
                postMessages: [],
            },
            liveListening: NO_LIVE_LISTENING,
            selectedEntryId: null,
            selectionCount: 0,
            selectedEntryDetail: null,
            detailVersion: 0,
            detailError: null,
            activeView: VIEW_ID.Traffic,
            inspectorTab: INSPECTOR_TAB_ID.General,
            contentFilter: CONTENT_FILTER_ID.All,
            frameFilter: FRAME_FILTERS.All,
            trafficLayout: TRAFFIC_LAYOUT.List,
            search: {
                query: {
                    text: '',
                    isRegex: false,
                    scopes: [SEARCH_SCOPES.Url],
                },
                searchedText: '',
                matches: [],
                error: null,
            },
            ruleSyncReport: null,
            ruleHits: {},
            capturedVariables: [],
            ruleEditRequest: null,
            clientLaunch: null,
            jwtLaunch: null,
            notice: null,
            theme: PANEL_THEMES.System,
        };
    },
};
