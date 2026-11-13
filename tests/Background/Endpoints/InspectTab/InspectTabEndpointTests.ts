import { describe, expect, test, vi } from "vitest";
import { InspectTabEndpoint } from "../../../../src/Background/Endpoints/InspectTab/InspectTabEndpoint";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import type { PanelConnection } from "../../../../src/Background/Features/PanelConnections/PanelConnection";
import { Result } from "../../../../src/Common/Results/Result";
import { InspectionState } from "../../../../src/Contracts/Inspection/InspectionState";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { aChannel, aSummary } from "../../../TestData";
import { aTimelineRecord } from "../../BackgroundTestData";

describe("InspectTabEndpoint", () => {
    test("handle_WhenATabIsInspected_ShouldReturnItsStatusCallsAndLiveChannels", async () => {
        // Arrange
        const inspectionService = {
            inspect: vi.fn().mockResolvedValue(Result.done()),
            release: vi.fn(),
            forget: vi.fn(),
            refreshInterception: vi.fn(),
            handleDetach: vi.fn(),
            statusOf: vi.fn().mockReturnValue({
                state: InspectionState.Attached,
                message: "",
            }),
        };
        const timelineStore = new TimelineStore();
        timelineStore.add(aTimelineRecord());
        const liveStore = new LiveStore();
        liveStore.upsertChannel(aChannel("ws-1"));
        const endpoint = new InspectTabEndpoint(
            inspectionService,
            timelineStore,
            liveStore
        );

        // Act
        const result = await endpoint.handle(
            {
                type: PanelCommandType.InspectTab,
                tabId: 7,
            },
            {
                connection: {
                    id: "connection-1",
                } as PanelConnection,
            }
        );

        // Assert
        expect(inspectionService.inspect).toHaveBeenCalledWith("connection-1", 7);
        expect(result).toEqual({
            hasErrors: false,
            value: {
                status: {
                    state: InspectionState.Attached,
                    message: "",
                },
                entries: [aSummary()],
                live: {
                    channels: [aChannel("ws-1")],
                    messages: [],
                    postMessages: [],
                },
            },
        });
    });
});
