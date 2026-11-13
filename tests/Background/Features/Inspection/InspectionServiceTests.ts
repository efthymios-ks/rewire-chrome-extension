import { describe, expect, test, vi } from "vitest";
import { TimelineLimits } from "../../../../src/Background/Features/Capture/TimelineLimits";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { DebuggerSessions } from "../../../../src/Background/Features/Debugging/DebuggerSessions";
import { FrameRegistry } from "../../../../src/Background/Features/Frames/FrameRegistry";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { InspectionService } from "../../../../src/Background/Features/Inspection/InspectionService";
import { PanelConnectionHub } from "../../../../src/Background/Features/PanelConnections/PanelConnectionHub";
import { InterceptionSessionStep } from "../../../../src/Background/Features/Sessions/InterceptionSessionStep";
import { SessionPreparer } from "../../../../src/Background/Features/Sessions/SessionPreparer";
import { Result } from "../../../../src/Common/Results/Result";
import { aSummary } from "../../../TestData";
import { activeRulesOf, aTimelineRecord, createDebuggerClientMock, createLogger } from "../../BackgroundTestData";

function setUp() {
    const debuggerMock = createDebuggerClientMock();
    debuggerMock.send.mockImplementation(async (_tabId, command) => command === "Page.getFrameTree"
        ? Result.ok({
            frameTree: {
                frame: {
                    id: "top-frame",
                },
            },
        })
        : Result.ok({}));
    const connectionHub = new PanelConnectionHub(createLogger());
    const timelineStore = new TimelineStore();
    const interception = new InterceptionSessionStep(debuggerMock.client, activeRulesOf([]));
    const sessions = new DebuggerSessions();
    const frameRegistry = new FrameRegistry();
    const service = new InspectionService({
        debuggerClient: debuggerMock.client,
        preparer: new SessionPreparer([interception], createLogger()),
        interception,
        sessions,
        frameRegistry,
        connectionHub,
        timelineStore,
        liveStore: new LiveStore(),
        liveListening: {
            forget: vi.fn(),
        },
        logger: createLogger(),
    });
    const connection = connectionHub.add({
        postMessage: vi.fn(),
    } as unknown as chrome.runtime.Port);

    return {
        debuggerClient: debuggerMock.client,
        sessions,
        frameRegistry,
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

    test("inspect_WhenAttaching_ShouldRecordTheTopFrame", async () => {
        // Arrange
        const { frameRegistry, connectionId, service } = setUp();

        // Act
        await service.inspect(connectionId, 1);

        // Assert
        expect(frameRegistry.frameOf(
            1,
            "top-frame",
            "https://app.example.com/"
        )?.isTop).toBe(true);
        expect(frameRegistry.frameOf(
            1,
            "iframe-1",
            "https://widget.example.com/"
        )?.isTop).toBe(false);
    });

    test("refreshInterception_WhenTheTabHasIframes_ShouldUpdateEverySession", async () => {
        // Arrange
        const { debuggerClient, sessions, connectionId, service } = setUp();
        await service.inspect(connectionId, 1);
        sessions.addChild(1, "session-a");
        vi.mocked(debuggerClient.sendToSession).mockClear();

        // Act
        await service.refreshInterception();

        // Assert
        expect(vi.mocked(debuggerClient.sendToSession).mock.calls.map(call => call[1])).toEqual([
            null,
            "session-a",
        ]);
    });

    test("handleDetach_WhenChromeDetaches_ShouldForgetTheIframeSessions", async () => {
        // Arrange
        const { sessions, connectionId, service } = setUp();
        await service.inspect(connectionId, 1);
        sessions.addChild(1, "session-a");

        // Act
        service.handleDetach(1, "target_closed");

        // Assert
        expect(sessions.childrenOf(1)).toEqual([]);
    });
});
