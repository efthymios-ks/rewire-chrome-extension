import { Result } from '../../../Common/Results/Result';
import { TabScopedKey } from '../../Core/TabScopedKey';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import { POST_MESSAGE_BINDING_NAME } from './PostMessageBindingName';
import { PostMessageProbe } from './PostMessageProbe';
import type { PostMessageProbeInstaller } from './PostMessageProbeInstaller';

const ROOT_SESSION_KEY = 'root';

function keyOf(tabId: number, sessionId: string | null): string {
    return TabScopedKey.of(tabId, sessionId ?? ROOT_SESSION_KEY);
}

export interface RemoveScriptAsyncOptions {
    tabId: number;
    sessionId: string | null;
    identifier: string;
}

export class DefaultPostMessageProbeInstaller implements PostMessageProbeInstaller {
    private readonly _debuggerClient: DebuggerClient;
    private readonly _scripts = new Map<string, string>();

    constructor(debuggerClient: DebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async installAsync(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const enabled = await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Runtime.enable',
        );
        if (enabled.hasErrors) {
            return enabled;
        }

        const bound = await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Runtime.addBinding',
            /* params: */ {
                name: POST_MESSAGE_BINDING_NAME,
            },
        );
        if (bound.hasErrors) {
            return bound;
        }

        const added = await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Page.addScriptToEvaluateOnNewDocument',
            /* params: */ {
                source: PostMessageProbe.source,
                runImmediately: true,
            },
        );
        if (added.hasErrors) {
            return added;
        }

        this._scripts.set(
            /* key: */ keyOf(tabId, sessionId),
            /* value: */ added.value.identifier,
        );

        return Result.done();
    }

    async uninstallAsync(tabId: number, sessionId: string | null): Promise<void> {
        const key = keyOf(tabId, sessionId);
        const identifier = this._scripts.get(key);
        this._scripts.delete(key);
        if (identifier != null) {
            await this.removeScriptAsync({ tabId, sessionId, identifier });
        }

        await this.removeProbesAsync(tabId, sessionId);
        await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Runtime.removeBinding',
            /* params: */ {
                name: POST_MESSAGE_BINDING_NAME,
            },
        );
        await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Runtime.disable',
        );
    }

    forget(tabId: number): void {
        [...this._scripts.keys()]
            .filter(key => TabScopedKey.isOfTab(key, tabId))
            .forEach(key => this._scripts.delete(key));
    }

    private async removeProbesAsync(tabId: number, sessionId: string | null): Promise<void> {
        // A script added with runImmediately also runs right away in every frame the session already has.
        const added = await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Page.addScriptToEvaluateOnNewDocument',
            /* params: */ {
                source: PostMessageProbe.removalSource,
                runImmediately: true,
            },
        );
        if (added.hasErrors) {
            return;
        }

        await this.removeScriptAsync({ tabId, sessionId, identifier: added.value.identifier });
    }

    private async removeScriptAsync({
        tabId,
        sessionId,
        identifier,
    }: RemoveScriptAsyncOptions): Promise<void> {
        await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Page.removeScriptToEvaluateOnNewDocument',
            /* params: */ {
                identifier,
            },
        );
    }
}
