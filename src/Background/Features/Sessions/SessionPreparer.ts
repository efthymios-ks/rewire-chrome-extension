import type { ILogger } from "../../../Common/Logging/ILogger";
import { Result } from "../../../Common/Results/Result";
import type { ISessionStep } from "./ISessionStep";

export interface ISessionPreparer {
    prepare(tabId: number, sessionId: string | null): Promise<Result<void>>;
}

export class SessionPreparer implements ISessionPreparer {
    private readonly _steps: ISessionStep[];
    private readonly _logger: ILogger;

    constructor(steps: ISessionStep[], logger: ILogger) {
        this._steps = steps;
        this._logger = logger;
    }

    async prepare(tabId: number, sessionId: string | null): Promise<Result<void>> {
        for (const step of this._steps) {
            const applied = await step.apply(tabId, sessionId);
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
