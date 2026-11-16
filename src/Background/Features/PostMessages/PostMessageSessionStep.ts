import { Result } from '../../../Common/Results/Result';
import type { LiveListeningRegistry } from '../Live/LiveListeningRegistry';
import type { SessionStep } from '../Sessions/SessionStep';
import type { PostMessageProbeInstaller } from './PostMessageProbeInstaller';

export class PostMessageSessionStep implements SessionStep {
    readonly name = 'postMessage capture';
    readonly isRequired = false;

    private readonly _installer: PostMessageProbeInstaller;
    private readonly _registry: LiveListeningRegistry;

    constructor(installer: PostMessageProbeInstaller, registry: LiveListeningRegistry) {
        this._installer = installer;
        this._registry = registry;
    }

    async applyAsync(tabId: number, sessionId: string | null): Promise<Result<void>> {
        if (!this._registry.of(tabId).postMessages) {
            return Result.done();
        }

        return this._installer.installAsync(tabId, sessionId);
    }
}
