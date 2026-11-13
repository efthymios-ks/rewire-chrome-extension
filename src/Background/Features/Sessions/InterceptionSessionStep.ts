import { Result } from "../../../Common/Results/Result";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import { FetchPatternBuilder } from "../Interception/FetchPatternBuilder";
import type { IActiveRules } from "../Rules/ActiveRules";
import type { ISessionStep } from "./ISessionStep";

export class InterceptionSessionStep implements ISessionStep {
    readonly name = "Interception";
    readonly isRequired = true;

    private readonly _debuggerClient: IDebuggerClient;
    private readonly _activeRules: IActiveRules;

    constructor(debuggerClient: IDebuggerClient, activeRules: IActiveRules) {
        this._debuggerClient = debuggerClient;
        this._activeRules = activeRules;
    }

    async apply(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const patterns = FetchPatternBuilder.build(this._activeRules.debuggerEntries());
        const applied = patterns.length === 0
            ? await this._debuggerClient.sendToSession(
                tabId,
                sessionId,
                "Fetch.disable"
            )
            : await this._debuggerClient.sendToSession(
                tabId,
                sessionId,
                "Fetch.enable",
                {
                    patterns,
                }
            );

        return applied.hasErrors ? applied : Result.done();
    }
}
