import { Result } from '../../../Common/Results/Result';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import { FetchPatternBuilder } from '../Interception/FetchPatternBuilder';
import type { ActiveRules } from '../Rules/ActiveRules';
import type { SessionStep } from './SessionStep';

export class InterceptionSessionStep implements SessionStep {
    readonly name = 'Interception';
    readonly isRequired = true;

    private readonly _debuggerClient: DebuggerClient;
    private readonly _activeRules: ActiveRules;

    constructor(debuggerClient: DebuggerClient, activeRules: ActiveRules) {
        this._debuggerClient = debuggerClient;
        this._activeRules = activeRules;
    }

    async applyAsync(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const patterns = FetchPatternBuilder.build(this._activeRules.debuggerEntries());
        const applied = patterns.length === 0
            ? await this._debuggerClient.sendToSessionAsync(
                /* tabId: */ tabId,
                /* sessionId: */ sessionId,
                /* command: */ 'Fetch.disable',
            )
            : await this._debuggerClient.sendToSessionAsync(
                /* tabId: */ tabId,
                /* sessionId: */ sessionId,
                /* command: */ 'Fetch.enable',
                /* params: */ {
                    patterns,
                },
            );

        return applied.hasErrors ? applied : Result.done();
    }
}
