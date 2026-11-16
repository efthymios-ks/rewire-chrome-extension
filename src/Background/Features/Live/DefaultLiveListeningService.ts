import type { Logger } from '../../../Common/Logging/Logger';
import type { LiveListening } from '../../../Contracts/Live/LiveListening';
import type { DebuggerSessions } from '../Debugging/DebuggerSessions';
import type { PostMessageProbeInstaller } from '../PostMessages/PostMessageProbeInstaller';
import type { LiveListeningRegistry } from './LiveListeningRegistry';
import type { LiveListeningService } from './LiveListeningService';

export interface DefaultLiveListeningServiceDependencies {
    registry: LiveListeningRegistry;
    installer: PostMessageProbeInstaller;
    sessions: DebuggerSessions;
    isAttached: (tabId: number) => boolean;
    logger: Logger;
}

export interface ApplyAsyncOptions {
    tabId: number;
    sessionId: string | null;
    isListening: boolean;
}

export class DefaultLiveListeningService implements LiveListeningService {
    private readonly _dependencies: DefaultLiveListeningServiceDependencies;

    constructor(dependencies: DefaultLiveListeningServiceDependencies) {
        this._dependencies = dependencies;
    }

    async setAsync(tabId: number, listening: LiveListening): Promise<void> {
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
            await this.applyAsync({ tabId, sessionId, isListening: listening.postMessages });
        }
    }

    forget(tabId: number): void {
        this._dependencies.registry.forget(tabId);
        this._dependencies.installer.forget(tabId);
    }

    private async applyAsync({ tabId, sessionId, isListening }: ApplyAsyncOptions): Promise<void> {
        const { installer, logger } = this._dependencies;
        if (!isListening) {
            await installer.uninstallAsync(tabId, sessionId);

            return;
        }

        const installed = await installer.installAsync(tabId, sessionId);
        if (installed.hasErrors) {
            logger.warn(`postMessage capture isn't available on tab ${tabId}.`, installed.error);
        }
    }
}
