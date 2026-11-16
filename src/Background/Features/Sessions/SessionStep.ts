import type { Result } from '../../../Common/Results/Result';

export interface SessionStep {
    readonly name: string;
    readonly isRequired: boolean;
    applyAsync(tabId: number, sessionId: string | null): Promise<Result<void>>;
}
