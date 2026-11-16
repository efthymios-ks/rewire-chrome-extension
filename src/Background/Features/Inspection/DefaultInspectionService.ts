import type { Logger } from '../../../Common/Logging/Logger';
import { Result } from '../../../Common/Results/Result';
import { INSPECTION_STATE } from '../../../Contracts/Inspection/InspectionState';
import type { InspectionStatus } from '../../../Contracts/Inspection/InspectionStatus';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import type { TimelineStore } from '../Capture/TimelineStore';
import { TIMELINE_LIMITS } from '../Capture/TimelineLimits';
import type { DebuggerSessions } from '../Debugging/DebuggerSessions';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { FrameRegistry } from '../Frames/FrameRegistry';
import type { LiveListeningService } from '../Live/LiveListeningService';
import type { LiveStore } from '../Live/LiveStore';
import type { PanelConnectionHub } from '../PanelConnections/PanelConnectionHub';
import type { SessionStep } from '../Sessions/SessionStep';
import type { SessionPreparer } from '../Sessions/SessionPreparer';
import { DetachReasonMessages } from './DetachReasonMessages';
import type { InspectionService } from './InspectionService';
import { KeptTimelines } from './KeptTimelines';

export interface DefaultInspectionServiceDependencies {
    debuggerClient: DebuggerClient;
    preparer: SessionPreparer;
    interception: SessionStep;
    sessions: DebuggerSessions;
    frameRegistry: FrameRegistry;
    connectionHub: PanelConnectionHub;
    timelineStore: TimelineStore;
    liveStore: LiveStore;
    liveListening: Pick<LiveListeningService, 'forget'>;
    logger: Logger;
}

export class DefaultInspectionService implements InspectionService {
    private readonly _dependencies: DefaultInspectionServiceDependencies;
    private readonly _attachedTabs = new Set<number>();
    private readonly _preparingTabs = new Set<number>();
    private readonly _failures = new Map<number, string>();
    private readonly _keptTimelines = new KeptTimelines(TIMELINE_LIMITS.MaxKeptTabs);

    constructor(dependencies: DefaultInspectionServiceDependencies) {
        this._dependencies = dependencies;
    }

    async inspectAsync(connectionId: string, tabId: number): Promise<Result<void>> {
        const previousTabId = this._dependencies.connectionHub.assignTab(connectionId, tabId);
        if (previousTabId != null && previousTabId !== tabId) {
            await this.parkAsync(previousTabId);
        }

        this._keptTimelines.resume(tabId);

        if (this._attachedTabs.has(tabId)) {
            return Result.done();
        }

        this.publish(
            /* tabId: */ tabId,
            /* status: */ {
                state: INSPECTION_STATE.Attaching,
                message: '',
            },
        );

        const attached = await this.attachAsync(tabId);
        if (attached.hasErrors) {
            this._failures.set(tabId, attached.error);
            this.publish(
                /* tabId: */ tabId,
                /* status: */ this.statusOf(tabId),
            );

            return attached;
        }

        this._failures.delete(tabId);
        this.publish(
            /* tabId: */ tabId,
            /* status: */ this.statusOf(tabId),
        );

        return Result.done();
    }

    async releaseAsync(tabId: number | null): Promise<void> {
        if (tabId != null && await this.detachIfUnusedAsync(tabId)) {
            this.clearTab(tabId);
        }

        if (!this._dependencies.connectionHub.hasConnections()) {
            this._keptTimelines
                .takeAll()
                .forEach(keptTabId => this.clearTab(keptTabId));
        }
    }

    forget(tabId: number): void {
        this.forgetSessions(tabId);
        this._keptTimelines.resume(tabId);
        this._failures.delete(tabId);
        this.clearTab(tabId);
    }

    async refreshInterceptionAsync(): Promise<void> {
        const { interception, sessions, logger } = this._dependencies;
        for (const tabId of this._attachedTabs) {
            const sessionIds = [
                null,
                ...sessions.childrenOf(tabId),
            ];
            for (const sessionId of sessionIds) {
                const applied = await interception.applyAsync(tabId, sessionId);
                if (applied.hasErrors) {
                    logger.warn(`Updating interception on tab ${tabId} failed.`, applied.error);
                }
            }
        }
    }

    handleDetach(tabId: number, reason: string): void {
        if (!this._attachedTabs.delete(tabId)) {
            return;
        }

        this.forgetSessions(tabId);
        this.clearTab(tabId);
        this.publish(
            /* tabId: */ tabId,
            /* status: */ {
                state: INSPECTION_STATE.Detached,
                message: DetachReasonMessages.of(reason),
            },
        );
    }

    statusOf(tabId: number): InspectionStatus {
        if (this._preparingTabs.has(tabId)) {
            return {
                state: INSPECTION_STATE.Attaching,
                message: '',
            };
        }

        if (this._attachedTabs.has(tabId)) {
            return {
                state: INSPECTION_STATE.Attached,
                message: '',
            };
        }

        const failure = this._failures.get(tabId);
        if (failure != null) {
            return {
                state: INSPECTION_STATE.Failed,
                message: failure,
            };
        }

        return {
            state: INSPECTION_STATE.Detached,
            message: '',
        };
    }

    private async attachAsync(tabId: number): Promise<Result<void>> {
        const { debuggerClient } = this._dependencies;
        const firstAttempt = await debuggerClient.attachAsync(tabId);
        if (firstAttempt.hasErrors) {
            await debuggerClient.detachAsync(tabId);
            const secondAttempt = await debuggerClient.attachAsync(tabId);
            if (secondAttempt.hasErrors) {
                return secondAttempt;
            }
        }

        this._attachedTabs.add(tabId);
        this._preparingTabs.add(tabId);
        await this.findTopFrameAsync(tabId);
        const prepared = await this._dependencies.preparer.prepareAsync(tabId, null);
        this._preparingTabs.delete(tabId);
        if (prepared.hasErrors && this._attachedTabs.has(tabId)) {
            await this.detachAsync(tabId);
        }

        return prepared;
    }

    private async findTopFrameAsync(tabId: number): Promise<void> {
        const { debuggerClient, frameRegistry, logger } = this._dependencies;
        const tree = await debuggerClient.sendAsync(tabId, 'Page.getFrameTree');
        if (tree.hasErrors) {
            logger.warn(`Reading the frames of tab ${tabId} failed.`, tree.error);

            return;
        }

        frameRegistry.setTop(tabId, tree.value.frameTree.frame.id);
    }

    private clearTab(tabId: number): void {
        this._dependencies.timelineStore.clear(tabId);
        this._dependencies.liveStore.clear(tabId);
    }

    private forgetSessions(tabId: number): void {
        this._dependencies.sessions.forget(tabId);
        this._dependencies.frameRegistry.forget(tabId);
        this._dependencies.liveListening.forget(tabId);
    }

    private async parkAsync(tabId: number): Promise<void> {
        if (!await this.detachIfUnusedAsync(tabId)) {
            return;
        }

        this._keptTimelines
            .keep(tabId)
            .forEach(droppedTabId => this.clearTab(droppedTabId));
    }

    private async detachIfUnusedAsync(tabId: number): Promise<boolean> {
        if (this._dependencies.connectionHub.isTabInspected(tabId) || !this._attachedTabs.has(tabId)) {
            return false;
        }

        await this.detachAsync(tabId);

        return true;
    }

    private async detachAsync(tabId: number): Promise<void> {
        const { debuggerClient, logger } = this._dependencies;
        this._attachedTabs.delete(tabId);
        this.forgetSessions(tabId);

        const detached = await debuggerClient.detachAsync(tabId);
        if (detached.hasErrors) {
            logger.warn(`Detaching from tab ${tabId} failed.`, detached.error);
        }
    }

    private publish(tabId: number, status: InspectionStatus): void {
        this._dependencies.connectionHub.publishToTab(
            /* tabId: */ tabId,
            /* event: */ {
                type: WORKER_EVENT_TYPE.InspectionChanged,
                tabId,
                status,
            },
        );
    }
}
