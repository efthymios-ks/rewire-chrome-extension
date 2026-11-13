import type { ILogger } from "../../../Common/Logging/ILogger";
import type { LiveListening } from "../../../Contracts/Live/LiveListening";
import type { IDebuggerSessions } from "../Debugging/DebuggerSessions";
import type { IPostMessageProbeInstaller } from "../PostMessages/PostMessageProbeInstaller";
import type { ILiveListeningRegistry } from "./LiveListeningRegistry";

export interface LiveListeningDependencies {
    registry: ILiveListeningRegistry;
    installer: IPostMessageProbeInstaller;
    sessions: IDebuggerSessions;
    isAttached: (tabId: number) => boolean;
    logger: ILogger;
}

export interface ILiveListeningService {
    set(tabId: number, listening: LiveListening): Promise<void>;
    forget(tabId: number): void;
}

export class LiveListeningService implements ILiveListeningService {
    private readonly _dependencies: LiveListeningDependencies;

    constructor(dependencies: LiveListeningDependencies) {
        this._dependencies = dependencies;
    }

    async set(tabId: number, listening: LiveListening): Promise<void> {
        const { registry, isAttached, sessions } = this._dependencies;
        const wasListening = registry.of(tabId).postMessages;
        registry.set(tabId, listening);
        if (wasListening === listening.postMessages || !isAttached(tabId)) {
            return;
        }

        const sessionIds = [
            null,
            ...sessions.childrenOf(tabId),
        ];
        for (const sessionId of sessionIds) {
            await this.apply(
                tabId,
                sessionId,
                listening.postMessages
            );
        }
    }

    forget(tabId: number): void {
        this._dependencies.registry.forget(tabId);
        this._dependencies.installer.forget(tabId);
    }

    private async apply(
        tabId: number,
        sessionId: string | null,
        isListening: boolean
    ): Promise<void> {
        const { installer, logger } = this._dependencies;
        if (!isListening) {
            await installer.uninstall(tabId, sessionId);

            return;
        }

        const installed = await installer.install(tabId, sessionId);
        if (installed.hasErrors) {
            logger.warn(`postMessage capture isn't available on tab ${tabId}.`, installed.error);
        }
    }
}
