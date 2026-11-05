import type { ILogger } from "../../../Common/Logging/ILogger";
import { Result } from "../../../Common/Results/Result";
import { InspectionState } from "../../../Contracts/Inspection/InspectionState";
import type { InspectionStatus } from "../../../Contracts/Inspection/InspectionStatus";
import { WorkerEventType } from "../../../Contracts/Messaging/WorkerEventType";
import type { ITimelineStore } from "../Capture/ITimelineStore";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import { FetchPatternBuilder } from "../Interception/FetchPatternBuilder";
import type { IPanelConnectionHub } from "../PanelConnections/PanelConnectionHub";
import type { IActiveRules } from "../Rules/ActiveRules";
import { DetachReasonMessages } from "./DetachReasonMessages";
import type { IInspectionService } from "./IInspectionService";

export interface InspectionDependencies {
    debuggerClient: IDebuggerClient;
    activeRules: IActiveRules;
    connectionHub: IPanelConnectionHub;
    timelineStore: ITimelineStore;
    logger: ILogger;
}

export class InspectionService implements IInspectionService {
    private readonly _dependencies: InspectionDependencies;
    private readonly _attachedTabs = new Set<number>();
    private readonly _failures = new Map<number, string>();

    constructor(dependencies: InspectionDependencies) {
        this._dependencies = dependencies;
    }

    async inspect(connectionId: string, tabId: number): Promise<Result<void>> {
        const previousTabId = this._dependencies.connectionHub.inspect(connectionId, tabId);
        if (previousTabId !== null && previousTabId !== tabId) {
            await this.detachIfUnused(previousTabId);
        }

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
        if (tabId === null) {
            return;
        }

        await this.detachIfUnused(tabId);
    }

    async refreshInterception(): Promise<void> {
        for (const tabId of this._attachedTabs) {
            const applied = await this.applyInterception(tabId);
            if (applied.hasErrors) {
                this._dependencies.logger.warn(`Updating interception on tab ${tabId} failed.`, applied.error);
            }
        }
    }

    handleDetach(tabId: number, reason: string): void {
        if (!this._attachedTabs.delete(tabId)) {
            return;
        }

        this._dependencies.timelineStore.clear(tabId);
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

        const network = await debuggerClient.send(
            tabId,
            "Network.enable",
            {}
        );
        if (network.hasErrors) {
            return network;
        }

        return this.applyInterception(tabId);
    }

    private async applyInterception(tabId: number): Promise<Result<void>> {
        const { debuggerClient, activeRules } = this._dependencies;
        const patterns = FetchPatternBuilder.build(activeRules.debuggerEntries());
        if (patterns.length === 0) {
            const disabled = await debuggerClient.send(tabId, "Fetch.disable");
            if (disabled.hasErrors) {
                return disabled;
            }

            return Result.done();
        }

        const enabled = await debuggerClient.send(
            tabId,
            "Fetch.enable",
            {
                patterns,
            }
        );
        if (enabled.hasErrors) {
            return enabled;
        }

        return Result.done();
    }

    private async detachIfUnused(tabId: number): Promise<void> {
        const { connectionHub, debuggerClient, timelineStore, logger } = this._dependencies;
        if (connectionHub.isTabInspected(tabId) || !this._attachedTabs.has(tabId)) {
            return;
        }

        this._attachedTabs.delete(tabId);
        timelineStore.clear(tabId);

        const detached = await debuggerClient.detach(tabId);
        if (detached.hasErrors) {
            logger.warn(`Detaching from tab ${tabId} failed.`, detached.error);
        }
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
