import type { ILogger } from "../../../Common/Logging/ILogger";
import { Result } from "../../../Common/Results/Result";
import { InspectionState } from "../../../Contracts/Inspection/InspectionState";
import type { InspectionStatus } from "../../../Contracts/Inspection/InspectionStatus";
import { WorkerEventType } from "../../../Contracts/Messaging/WorkerEventType";
import type { ITimelineStore } from "../Capture/ITimelineStore";
import { TimelineLimits } from "../Capture/TimelineLimits";
import type { IDebuggerSessions } from "../Debugging/DebuggerSessions";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import type { IFrameRegistry } from "../Frames/FrameRegistry";
import type { ILiveListeningService } from "../Live/LiveListeningService";
import type { ILiveStore } from "../Live/LiveStore";
import type { IPanelConnectionHub } from "../PanelConnections/PanelConnectionHub";
import type { ISessionStep } from "../Sessions/ISessionStep";
import type { ISessionPreparer } from "../Sessions/SessionPreparer";
import { DetachReasonMessages } from "./DetachReasonMessages";
import type { IInspectionService } from "./IInspectionService";
import { KeptTimelines } from "./KeptTimelines";

export interface InspectionDependencies {
    debuggerClient: IDebuggerClient;
    preparer: ISessionPreparer;
    interception: ISessionStep;
    sessions: IDebuggerSessions;
    frameRegistry: IFrameRegistry;
    connectionHub: IPanelConnectionHub;
    timelineStore: ITimelineStore;
    liveStore: ILiveStore;
    liveListening: Pick<ILiveListeningService, "forget">;
    logger: ILogger;
}

export class InspectionService implements IInspectionService {
    private readonly _dependencies: InspectionDependencies;
    private readonly _attachedTabs = new Set<number>();
    private readonly _failures = new Map<number, string>();
    private readonly _keptTimelines = new KeptTimelines(TimelineLimits.MaxKeptTabs);

    constructor(dependencies: InspectionDependencies) {
        this._dependencies = dependencies;
    }

    async inspect(connectionId: string, tabId: number): Promise<Result<void>> {
        const previousTabId = this._dependencies.connectionHub.inspect(connectionId, tabId);
        if (previousTabId !== null && previousTabId !== tabId) {
            await this.park(previousTabId);
        }

        this._keptTimelines.resume(tabId);

        if (this._attachedTabs.has(tabId)) {
            return Result.done();
        }

        this.publish(
            tabId,
            {
                state: InspectionState.Attaching,
                message: "",
            }
        );

        const attached = await this.attach(tabId);
        if (attached.hasErrors) {
            this._failures.set(tabId, attached.error);
            this.publish(tabId, this.statusOf(tabId));

            return attached;
        }

        this._failures.delete(tabId);
        this.publish(tabId, this.statusOf(tabId));

        return Result.done();
    }

    async release(tabId: number | null): Promise<void> {
        if (tabId !== null && await this.detachIfUnused(tabId)) {
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

    async refreshInterception(): Promise<void> {
        const { interception, sessions, logger } = this._dependencies;
        for (const tabId of this._attachedTabs) {
            const sessionIds = [
                null,
                ...sessions.childrenOf(tabId),
            ];
            for (const sessionId of sessionIds) {
                const applied = await interception.apply(tabId, sessionId);
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
            tabId,
            {
                state: InspectionState.Detached,
                message: DetachReasonMessages.of(reason),
            }
        );
    }

    statusOf(tabId: number): InspectionStatus {
        if (this._attachedTabs.has(tabId)) {
            return {
                state: InspectionState.Attached,
                message: "",
            };
        }

        const failure = this._failures.get(tabId);
        if (failure !== undefined) {
            return {
                state: InspectionState.Failed,
                message: failure,
            };
        }

        return {
            state: InspectionState.Detached,
            message: "",
        };
    }

    private async attach(tabId: number): Promise<Result<void>> {
        const { debuggerClient } = this._dependencies;
        const firstAttempt = await debuggerClient.attach(tabId);
        if (firstAttempt.hasErrors) {
            await debuggerClient.detach(tabId);
            const secondAttempt = await debuggerClient.attach(tabId);
            if (secondAttempt.hasErrors) {
                return secondAttempt;
            }
        }

        this._attachedTabs.add(tabId);
        await this.findTopFrame(tabId);

        return this._dependencies.preparer.prepare(tabId, null);
    }

    private async findTopFrame(tabId: number): Promise<void> {
        const { debuggerClient, frameRegistry, logger } = this._dependencies;
        const tree = await debuggerClient.send(tabId, "Page.getFrameTree");
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

    private async park(tabId: number): Promise<void> {
        if (!await this.detachIfUnused(tabId)) {
            return;
        }

        this._keptTimelines
            .keep(tabId)
            .forEach(droppedTabId => this.clearTab(droppedTabId));
    }

    private async detachIfUnused(tabId: number): Promise<boolean> {
        const { connectionHub, debuggerClient, logger } = this._dependencies;
        if (connectionHub.isTabInspected(tabId) || !this._attachedTabs.has(tabId)) {
            return false;
        }

        this._attachedTabs.delete(tabId);
        this.forgetSessions(tabId);

        const detached = await debuggerClient.detach(tabId);
        if (detached.hasErrors) {
            logger.warn(`Detaching from tab ${tabId} failed.`, detached.error);
        }

        return true;
    }

    private publish(tabId: number, status: InspectionStatus): void {
        this._dependencies.connectionHub.publishToTab(
            tabId,
            {
                type: WorkerEventType.InspectionChanged,
                tabId,
                status,
            }
        );
    }
}
