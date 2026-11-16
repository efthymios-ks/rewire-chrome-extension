import { describe, expect, test, vi } from 'vitest';
import { ClearTimelineEndpoint } from './ClearTimelineEndpoint';
import { DefaultTimelineStore } from '../../Features/Capture/DefaultTimelineStore';
import type { PanelConnectionHub } from '../../Features/PanelConnections/PanelConnectionHub';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

const TAB_ID = 7;
const OTHER_TAB_ID = 8;

function createConnectionHubMock(): PanelConnectionHub {
    return {
        add: vi.fn(),
        remove: vi.fn(),
        assignTab: vi.fn(),
        isTabInspected: vi.fn(),
        hasConnections: vi.fn(),
        send: vi.fn(),
        publishToTab: vi.fn(),
    };
}

describe('ClearTimelineEndpoint', () => {
    test('handleAsync_WhenTheTabHasEntries_ShouldClearOnlyThatTab', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord());
        store.add(aTimelineRecord({
            summary: aSummary({
                tabId: OTHER_TAB_ID,
            }),
        }));
        const endpoint = new ClearTimelineEndpoint(store, createConnectionHubMock());

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.ClearTimeline,
            tabId: TAB_ID,
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(store.list(TAB_ID)).toEqual([]);
        expect(store.list(OTHER_TAB_ID)).toHaveLength(1);
    });

    test('handleAsync_WhenTheTimelineIsCleared_ShouldTellThePanelsOfThatTab', async () => {
        // Arrange
        const connectionHub = createConnectionHubMock();
        const endpoint = new ClearTimelineEndpoint(new DefaultTimelineStore(), connectionHub);

        // Act
        await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.ClearTimeline,
            tabId: TAB_ID,
        });

        // Assert
        expect(connectionHub.publishToTab).toHaveBeenCalledWith(
            /* tabId: */ TAB_ID,
            /* event: */ {
                type: WORKER_EVENT_TYPE.TimelineCleared,
                tabId: TAB_ID,
            },
        );
    });
});
