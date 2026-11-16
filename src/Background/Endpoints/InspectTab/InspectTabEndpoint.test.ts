import { describe, expect, test, vi } from 'vitest';
import { InspectTabEndpoint } from './InspectTabEndpoint';
import { DefaultTimelineStore } from '../../Features/Capture/DefaultTimelineStore';
import { DefaultLiveStore } from '../../Features/Live/DefaultLiveStore';
import type { PanelConnection } from '../../Features/PanelConnections/PanelConnection';
import { Result } from '../../../Common/Results/Result';
import { INSPECTION_STATE } from '../../../Contracts/Inspection/InspectionState';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { aChannel, aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

describe('InspectTabEndpoint', () => {
    test('handleAsync_WhenATabIsInspected_ShouldReturnItsStatusCallsAndLiveChannels', async () => {
        // Arrange
        const inspectionService = {
            inspectAsync: vi.fn().mockResolvedValue(Result.done()),
            releaseAsync: vi.fn(),
            forget: vi.fn(),
            refreshInterceptionAsync: vi.fn(),
            handleDetach: vi.fn(),
            statusOf: vi.fn().mockReturnValue({
                state: INSPECTION_STATE.Attached,
                message: '',
            }),
        };
        const timelineStore = new DefaultTimelineStore();
        timelineStore.add(aTimelineRecord());
        const liveStore = new DefaultLiveStore();
        liveStore.upsertChannel(aChannel({ id: 'ws-1' }));
        const endpoint = new InspectTabEndpoint({ inspectionService, timelineStore, liveStore });

        // Act
        const result = await endpoint.handleAsync(
            /* command: */ {
                type: PANEL_COMMAND_TYPE.InspectTab,
                tabId: 7,
            },
            /* context: */ {
                connection: {
                    id: 'connection-1',
                } as PanelConnection,
            },
        );

        // Assert
        expect(inspectionService.inspectAsync).toHaveBeenCalledWith('connection-1', 7);
        expect(result).toEqual({
            hasErrors: false,
            value: {
                status: {
                    state: INSPECTION_STATE.Attached,
                    message: '',
                },
                entries: [aSummary()],
                live: {
                    channels: [aChannel({ id: 'ws-1' })],
                    messages: [],
                    postMessages: [],
                },
            },
        });
    });
});
