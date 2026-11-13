import { Result } from "../../../Common/Results/Result";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import { PostMessageBindingName, PostMessageProbe } from "./PostMessageProbe";

const RootSessionKey = "root";

function keyOf(tabId: number, sessionId: string | null): string {
    return `${tabId}:${sessionId ?? RootSessionKey}`;
}

export interface IPostMessageProbeInstaller {
    install(tabId: number, sessionId: string | null): Promise<Result<void>>;
    uninstall(tabId: number, sessionId: string | null): Promise<void>;
    forget(tabId: number): void;
}

export class PostMessageProbeInstaller implements IPostMessageProbeInstaller {
    private readonly _debuggerClient: IDebuggerClient;
    private readonly _scripts = new Map<string, string>();

    constructor(debuggerClient: IDebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async install(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const enabled = await this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Runtime.enable"
        );
        if (enabled.hasErrors) {
            return enabled;
        }

        const bound = await this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Runtime.addBinding",
            {
                name: PostMessageBindingName,
            }
        );
        if (bound.hasErrors) {
            return bound;
        }

        const added = await this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Page.addScriptToEvaluateOnNewDocument",
            {
                source: PostMessageProbe.source,
            }
        );
        if (added.hasErrors) {
            return added;
        }

        this._scripts.set(keyOf(tabId, sessionId), added.value.identifier);
        void this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Runtime.evaluate",
            {
                expression: PostMessageProbe.source,
            }
        );

        return Result.done();
    }

    async uninstall(tabId: number, sessionId: string | null): Promise<void> {
        const key = keyOf(tabId, sessionId);
        const identifier = this._scripts.get(key);
        this._scripts.delete(key);
        if (identifier !== undefined) {
            await this._debuggerClient.sendToSession(
                tabId,
                sessionId,
                "Page.removeScriptToEvaluateOnNewDocument",
                {
                    identifier,
                }
            );
        }

        await this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Runtime.removeBinding",
            {
                name: PostMessageBindingName,
            }
        );
        await this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Runtime.disable"
        );
    }

    forget(tabId: number): void {
        const prefix = `${tabId}:`;
        [...this._scripts.keys()]
            .filter(key => key.startsWith(prefix))
            .forEach(key => this._scripts.delete(key));
    }
}
