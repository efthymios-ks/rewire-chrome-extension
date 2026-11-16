import { Result } from '../../../Common/Results/Result';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { SessionStep } from './SessionStep';

export class NetworkSessionStep implements SessionStep {
    readonly name = 'Network capture';
    readonly isRequired = true;

    private readonly _debuggerClient: DebuggerClient;

    constructor(debuggerClient: DebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async applyAsync(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const enabled = await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Network.enable',
            /* params: */ {},
        );

        return enabled.hasErrors ? enabled : Result.done();
    }
}
