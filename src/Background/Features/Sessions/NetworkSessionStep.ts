import { Result } from "../../../Common/Results/Result";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import type { ISessionStep } from "./ISessionStep";

export class NetworkSessionStep implements ISessionStep {
    readonly name = "Network capture";
    readonly isRequired = true;

    private readonly _debuggerClient: IDebuggerClient;

    constructor(debuggerClient: IDebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async apply(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const enabled = await this._debuggerClient.sendToSession(
            tabId,
            sessionId,
            "Network.enable",
            {}
        );

        return enabled.hasErrors ? enabled : Result.done();
    }
}
