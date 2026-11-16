import type { Logger } from '../../../Common/Logging/Logger';
import { Result } from '../../../Common/Results/Result';
import type { SessionPreparer } from './SessionPreparer';
import type { SessionStep } from './SessionStep';

export class DefaultSessionPreparer implements SessionPreparer {
    private readonly _steps: SessionStep[];
    private readonly _logger: Logger;

    constructor(steps: SessionStep[], logger: Logger) {
        this._steps = steps;
        this._logger = logger;
    }

    async prepareAsync(tabId: number, sessionId: string | null): Promise<Result<void>> {
        for (const step of this._steps) {
            const applied = await step.applyAsync(tabId, sessionId);
            if (!applied.hasErrors) {
                continue;
            }

            if (step.isRequired) {
                return applied;
            }

            this._logger.warn(`${step.name} isn't available on tab ${tabId}.`, applied.error);
        }

        return Result.done();
    }
}
