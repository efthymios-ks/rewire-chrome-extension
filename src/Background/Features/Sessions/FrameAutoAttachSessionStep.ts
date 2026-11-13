import { Result } from "../../../Common/Results/Result";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import type { ISessionStep } from "./ISessionStep";

const IframeTargetType = "iframe";

export class FrameAutoAttachSessionStep implements ISessionStep {
    readonly name = "Cross-origin iframes";
    readonly isRequired = false;

    private readonly _debuggerClient: IDebuggerClient;

    constructor(debuggerClient: IDebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async apply(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const attached = await this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Target.setAutoAttach",
            {
                autoAttach: true,
                waitForDebuggerOnStart: true,
                flatten: true,
                filter: [
                    {
                        type: IframeTargetType,
                    },
                ],
            }
        );

        return attached.hasErrors ? attached : Result.done();
    }
}
