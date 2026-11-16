import { Result } from '../../../Common/Results/Result';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { SessionStep } from './SessionStep';

const IFRAME_TARGET_TYPE = 'iframe';

export class FrameAutoAttachSessionStep implements SessionStep {
    readonly name = 'Cross-origin iframes';
    readonly isRequired = false;

    private readonly _debuggerClient: DebuggerClient;

    constructor(debuggerClient: DebuggerClient) {
        this._debuggerClient = debuggerClient;
    }

    async applyAsync(tabId: number, sessionId: string | null): Promise<Result<void>> {
        const attached = await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ sessionId,
            /* command: */ 'Target.setAutoAttach',
            /* params: */ {
                autoAttach: true,
                waitForDebuggerOnStart: true,
                flatten: true,
                filter: [
                    {
                        type: IFRAME_TARGET_TYPE,
                    },
                ],
            },
        );

        return attached.hasErrors ? attached : Result.done();
    }
}
