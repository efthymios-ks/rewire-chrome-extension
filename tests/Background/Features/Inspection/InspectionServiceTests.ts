import { describe, expect, test, vi } from "vitest";
import { TimelineLimits } from "../../../../src/Background/Features/Capture/TimelineLimits";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { InspectionService } from "../../../../src/Background/Features/Inspection/InspectionService";
import { PanelConnectionHub } from "../../../../src/Background/Features/PanelConnections/PanelConnectionHub";
import { aSummary } from "../../../TestData";
import { activeRulesOf, aTimelineRecord, createDebuggerClientMock, createLogger } from "../../BackgroundTestData";

function setUp() {
    const debuggerMock = createDebuggerClientMock();
    const connectionHub = new PanelConnectionHub(createLogger());
    const timelineStore = new TimelineStore();
    const service = new InspectionService({
        debuggerClient: debuggerMock.client,
        activeRules: activeRulesOf([]),
        connectionHub,
        timelineStore,
        logger: createLogger(),
    });
    const connection = connectionHub.add({
        postMessage: vi.fn(),
    } as unknown as chrome.runtime.Port);

    return {
        debuggerClient: debuggerMock.client,
        connectionHub,
        connectionId: connection.id,
        timelineStore,
        service,
    };
}

function addCall(store: TimelineStore, tabId: number): void {
    store.add(aTimelineRecord({
        summary: aSummary({
            id: `request-${tabId}`,
            tabId,
        }),
    }));
}

describe("InspectionService", () => {
    test("inspect_WhenSwitchingTabs_ShouldDetachTheOldTabButKeepItsTimeline", async () => {
        // Arrange
        const { debuggerClient, connectionId, timelineStore, service } = setUp();
        await service.inspect(connectionId, 1);
        addCall(timelineStore, 1);

        // Act
        await service.inspect(connectionId, 2);

        // Assert
        expect(debuggerClient.detach).toHaveBeenCalledWith(1);
        expect(timelineStore.list(1).map(entry => entry.id)).toEqual(["request-1"]);
    });

    test("inspect_WhenSwitchingBack_ShouldAttachAgainAndShowTheKeptCalls", async () => {
        // Arrange
        const { debuggerClient, connectionId, timelineStore, service } = setUp();
        await service.inspect(connectionId, 1);
        addCall(timelineStore, 1);
        await service.inspect(connectionId, 2);

        // Act
        await service.inspect(connectionId, 1);

        // Assert
        expect(vi.mocked(debuggerClient.attach).mock.calls.map(call => call[0])).toEqual([
            1,
            2,
            1,
        ]);
        expect(timelineStore.list(1)).toHaveLength(1);
    });

    test("inspect_WhenMoreTabsAreLeftThanTheLimit_ShouldDropTheOldestTimeline", async () => {
        // Arrange
        const { connectionId, timelineStore, service } = setUp();
        const lastTabId = TimelineLimits.MaxKeptTabs + 2;
        for (let tabId = 1; tabId < lastTabId; tabId++) {
            await service.inspect(connectionId, tabId);
            addCall(timelineStore, tabId);
        }

        // Act
        await service.inspect(connectionId, lastTabId);

        // Assert
        expect(timelineStore.list(1)).toEqual([]);
        expect(timelineStore.list(2)).toHaveLength(1);
        expect(timelineStore.list(lastTabId - 1)).toHaveLength(1);
    });

    test("release_WhenTheLastPanelCloses_ShouldClearEveryTimeline", async () => {
        // Arrange
        const { connectionHub, connectionId, timelineStore, service } = setUp();
        await service.inspect(connectionId, 1);
        addCall(timelineStore, 1);
        await service.inspect(connectionId, 2);
        addCall(timelineStore, 2);
        connectionHub.remove(connectionId);

        // Act
        await service.release(2);

        // Assert
        expect(timelineStore.list(1)).toEqual([]);
        expect(timelineStore.list(2)).toEqual([]);
    });

    test("forget_WhenAKeptTabCloses_ShouldClearItsTimeline", async () => {
        // Arrange
        const { connectionId, timelineStore, service } = setUp();
        await service.inspect(connectionId, 1);
        addCall(timelineStore, 1);
        await service.inspect(connectionId, 2);

        // Act
        service.forget(1);

        // Assert
        expect(timelineStore.list(1)).toEqual([]);
    });
});
