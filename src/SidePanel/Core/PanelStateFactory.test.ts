import { describe, expect, test } from 'vitest';
import { INSPECTION_STATE } from '../../Contracts/Inspection/InspectionState';
import { DEFAULT_PANEL_SETTINGS } from '../../Contracts/Settings/DefaultPanelSettings';
import { CONTENT_FILTER_ID } from './ContentFilterId';
import { FRAME_FILTERS } from './FrameFilters';
import { INSPECTOR_TAB_ID } from './InspectorTabId';
import { PanelStateFactory } from './PanelStateFactory';
import { PANEL_THEMES } from './PanelTheme';
import { TRAFFIC_LAYOUT } from './TrafficLayout';
import { VIEW_ID } from './ViewId';

describe('PanelStateFactory', () => {
    test('initial_WhenCalled_ShouldStartIdleOnTheTrafficViewWithNothingCaptured', () => {
        // Arrange
        const expectedView = VIEW_ID.Traffic;

        // Act
        const state = PanelStateFactory.initial();

        // Assert
        expect(state.activeView).toBe(expectedView);
        expect(state.settings).toBe(DEFAULT_PANEL_SETTINGS);
        expect(state.inspectedTab).toBeNull();
        expect(state.inspection.state).toBe(INSPECTION_STATE.Idle);
        expect(state.entries).toEqual([]);
        expect(state.selectedEntryId).toBeNull();
        expect(state.inspectorTab).toBe(INSPECTOR_TAB_ID.General);
        expect(state.contentFilter).toBe(CONTENT_FILTER_ID.All);
        expect(state.frameFilter).toBe(FRAME_FILTERS.All);
        expect(state.trafficLayout).toBe(TRAFFIC_LAYOUT.List);
        expect(state.search.searchedText).toBe('');
        expect(state.notice).toBeNull();
        expect(state.theme).toBe(PANEL_THEMES.System);
    });

    test('initial_WhenCalledTwice_ShouldNotShareMutableCollections', () => {
        // Arrange
        const first = PanelStateFactory.initial();

        // Act
        const second = PanelStateFactory.initial();

        // Assert
        expect(second.entries).not.toBe(first.entries);
        expect(second.live).not.toBe(first.live);
        expect(second.search).not.toBe(first.search);
        expect(second.ruleHits).not.toBe(first.ruleHits);
    });
});
