import { Result } from "../../../Common/Results/Result";
import type { ILiveListeningRegistry } from "../Live/LiveListeningRegistry";
import type { ISessionStep } from "../Sessions/ISessionStep";
import type { IPostMessageProbeInstaller } from "./PostMessageProbeInstaller";

export class PostMessageSessionStep implements ISessionStep {
    readonly name = "postMessage capture";
    readonly isRequired = false;

    private readonly _installer: IPostMessageProbeInstaller;
    private readonly _registry: ILiveListeningRegistry;

    constructor(installer: IPostMessageProbeInstaller, registry: ILiveListeningRegistry) {
        this._installer = installer;
        this._registry = registry;
    }

    async apply(tabId: number, sessionId: string | null): Promise<Result<void>> {
        if (!this._registry.of(tabId).postMessages) {
            return Result.done();
        }

        return this._installer.install(tabId, sessionId);
    }
}
