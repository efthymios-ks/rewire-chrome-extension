import { describe, expect, test, vi } from 'vitest';
import { TIMELINE_LIMITS } from '../Capture/TimelineLimits';
import { DefaultTimelineStore } from '../Capture/DefaultTimelineStore';
import { DefaultDebuggerSessions } from '../Debugging/DefaultDebuggerSessions';
import { DefaultFrameRegistry } from '../Frames/DefaultFrameRegistry';
import { DefaultInspectionService } from './DefaultInspectionService';
import { DefaultLiveStore } from '../Live/DefaultLiveStore';
import { DefaultPanelConnectionHub } from '../PanelConnections/DefaultPanelConnectionHub';
import { DefaultSessionPreparer } from '../Sessions/DefaultSessionPreparer';
import { InterceptionSessionStep } from '../Sessions/InterceptionSessionStep';
import { Result } from '../../../Common/Results/Result';
import { INSPECTION_STATE } from '../../../Contracts/Inspection/InspectionState';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import { aSummary, createLogger, nextTaskAsync } from '../../../TestData';
import { activeRulesOf, aTimelineRecord, createDebuggerClientMock } from '../../BackgroundTestData';

const PREPARE_ERROR = 'Fetch.disable failed: Not allowed.';

function setUp() {
    const debuggerMock = createDebuggerClientMock();
    debuggerMock.send.mockImplementation(async (_tabId, command) => command === 'Page.getFrameTree'
        ? Result.ok({
            frameTree: {
                frame: {
                    id: 'top-frame',
                },
            },
        })
        : Result.ok({}));
    const connectionHub = new DefaultPanelConnectionHub(createLogger());
    const timelineStore = new DefaultTimelineStore();
    const interception = new InterceptionSessionStep(
        /* debuggerClient: */ debuggerMock.client,
        /* activeRules: */ activeRulesOf([]),
    );
    const sessions = new DefaultDebuggerSessions();
    const frameRegistry = new DefaultFrameRegistry();
    const service = new DefaultInspectionService({
        debuggerClient: debuggerMock.client,
        preparer: new DefaultSessionPreparer(
            /* steps: */ [interception],
            /* logger: */ createLogger(),
        ),
        interception,
        sessions,
        frameRegistry,
        connectionHub,
        timelineStore,
        liveStore: new DefaultLiveStore(),
        liveListening: {
            forget: vi.fn(),
        },
        logger: createLogger(),
    });
    const port = {
        postMessage: vi.fn(),
    };
    const connection = connectionHub.add(port as unknown as chrome.runtime.Port);

    return {
        debuggerClient: debuggerMock.client,
        port,
        sessions,
        frameRegistry,
        connectionHub,
        connectionId: connection.id,
        timelineStore,
        service,
    };
}

function addCall(store: DefaultTimelineStore, tabId: number): void {
    store.add(aTimelineRecord({
        summary: aSummary({
            id: `request-${tabId}`,
            tabId,
        }),
    }));
}

describe('DefaultInspectionService', () => {
    test('inspectAsync_WhenSwitchingTabs_ShouldDetachTheOldTabButKeepItsTimeline', async () => {
        // Arrange
        const { debuggerClient, connectionId, timelineStore, service } = setUp();
        await service.inspectAsync(connectionId, 1);
        addCall(timelineStore, 1);

        // Act
        await service.inspectAsync(connectionId, 2);

        // Assert
        expect(debuggerClient.detachAsync).toHaveBeenCalledWith(1);
        expect(timelineStore.list(1).map(entry => entry.id)).toEqual(['request-1']);
    });

    test('inspectAsync_WhenSwitchingBack_ShouldAttachAgainAndShowTheKeptCalls', async () => {
        // Arrange
        const { debuggerClient, connectionId, timelineStore, service } = setUp();
        await service.inspectAsync(connectionId, 1);
        addCall(timelineStore, 1);
        await service.inspectAsync(connectionId, 2);

        // Act
        await service.inspectAsync(connectionId, 1);

        // Assert
        expect(vi.mocked(debuggerClient.attachAsync).mock.calls.map(call => call[0])).toEqual([
            1,
            2,
            1,
        ]);
        expect(timelineStore.list(1)).toHaveLength(1);
    });

    test('inspectAsync_WhenMoreTabsAreLeftThanTheLimit_ShouldDropTheOldestTimeline', async () => {
        // Arrange
        const { connectionId, timelineStore, service } = setUp();
        const lastTabId = TIMELINE_LIMITS.MaxKeptTabs + 2;
        for (let tabId = 1; tabId < lastTabId; tabId++) {
            await service.inspectAsync(connectionId, tabId);
            addCall(timelineStore, tabId);
        }

        // Act
        await service.inspectAsync(connectionId, lastTabId);

        // Assert
        expect(timelineStore.list(1)).toEqual([]);
        expect(timelineStore.list(2)).toHaveLength(1);
        expect(timelineStore.list(lastTabId - 1)).toHaveLength(1);
    });

    test('releaseAsync_WhenTheLastPanelCloses_ShouldClearEveryTimeline', async () => {
        // Arrange
        const { connectionHub, connectionId, timelineStore, service } = setUp();
        await service.inspectAsync(connectionId, 1);
        addCall(timelineStore, 1);
        await service.inspectAsync(connectionId, 2);
        addCall(timelineStore, 2);
        connectionHub.remove(connectionId);

        // Act
        await service.releaseAsync(2);

        // Assert
        expect(timelineStore.list(1)).toEqual([]);
        expect(timelineStore.list(2)).toEqual([]);
    });

    test('forget_WhenAKeptTabCloses_ShouldClearItsTimeline', async () => {
        // Arrange
        const { connectionId, timelineStore, service } = setUp();
        await service.inspectAsync(connectionId, 1);
        addCall(timelineStore, 1);
        await service.inspectAsync(connectionId, 2);

        // Act
        service.forget(1);

        // Assert
        expect(timelineStore.list(1)).toEqual([]);
    });

    test('inspectAsync_WhenAttaching_ShouldRecordTheTopFrame', async () => {
        // Arrange
        const { frameRegistry, connectionId, service } = setUp();

        // Act
        await service.inspectAsync(connectionId, 1);

        // Assert
        expect(frameRegistry.frameOf({
            tabId: 1,
            frameId: 'top-frame',
            documentUrl: 'https://app.example.com/',
        })?.isTop).toBe(true);
        expect(frameRegistry.frameOf({
            tabId: 1,
            frameId: 'iframe-1',
            documentUrl: 'https://widget.example.com/',
        })?.isTop).toBe(false);
    });

    test('refreshInterceptionAsync_WhenTheTabHasIframes_ShouldUpdateEverySession', async () => {
        // Arrange
        const { debuggerClient, sessions, connectionId, service } = setUp();
        await service.inspectAsync(connectionId, 1);
        sessions.addChild(1, 'session-a');
        vi.mocked(debuggerClient.sendToSessionAsync).mockClear();

        // Act
        await service.refreshInterceptionAsync();

        // Assert
        expect(vi.mocked(debuggerClient.sendToSessionAsync).mock.calls.map(call => call[1])).toEqual([
            null,
            'session-a',
        ]);
    });

    test('handleDetach_WhenChromeDetaches_ShouldForgetTheIframeSessions', async () => {
        // Arrange
        const { sessions, connectionId, service } = setUp();
        await service.inspectAsync(connectionId, 1);
        sessions.addChild(1, 'session-a');

        // Act
        service.handleDetach(1, 'target_closed');

        // Assert
        expect(sessions.childrenOf(1)).toEqual([]);
    });

    test('inspectAsync_WhenPreparingTheTabFails_ShouldDetachAndReportTheFailure', async () => {
        // Arrange
        const { debuggerClient, port, connectionId, service } = setUp();
        vi.mocked(debuggerClient.sendToSessionAsync).mockResolvedValueOnce(Result.fail(PREPARE_ERROR));

        // Act
        const result = await service.inspectAsync(connectionId, 1);

        // Assert
        expect(result).toEqual(Result.fail(PREPARE_ERROR));
        expect(debuggerClient.detachAsync).toHaveBeenCalledWith(1);
        expect(service.statusOf(1)).toEqual({
            state: INSPECTION_STATE.Failed,
            message: PREPARE_ERROR,
        });
        expect(port.postMessage).toHaveBeenLastCalledWith({
            type: WORKER_EVENT_TYPE.InspectionChanged,
            tabId: 1,
            status: {
                state: INSPECTION_STATE.Failed,
                message: PREPARE_ERROR,
            },
        });
    });

    test('inspectAsync_WhenAFailedTabIsInspectedAgain_ShouldRetryTheAttach', async () => {
        // Arrange
        const { debuggerClient, connectionId, service } = setUp();
        vi.mocked(debuggerClient.sendToSessionAsync).mockResolvedValueOnce(Result.fail(PREPARE_ERROR));
        await service.inspectAsync(connectionId, 1);

        // Act
        const result = await service.inspectAsync(connectionId, 1);

        // Assert
        expect(result).toEqual(Result.done());
        expect(debuggerClient.attachAsync).toHaveBeenCalledTimes(2);
        expect(service.statusOf(1).state).toBe(INSPECTION_STATE.Attached);
    });

    test('statusOf_WhenTheTabIsBeingPrepared_ShouldSayAttaching', async () => {
        // Arrange
        const { debuggerClient, connectionId, service } = setUp();
        let finishPreparing = (): void => {};
        vi.mocked(debuggerClient.sendToSessionAsync).mockReturnValueOnce(new Promise(resolve => {
            finishPreparing = () => resolve(Result.ok({}));
        }));
        const inspecting = service.inspectAsync(connectionId, 1);
        await nextTaskAsync();

        // Act
        const status = service.statusOf(1);

        // Assert
        expect(status.state).toBe(INSPECTION_STATE.Attaching);
        finishPreparing();
        await inspecting;
        expect(service.statusOf(1).state).toBe(INSPECTION_STATE.Attached);
    });
});
