import { Result } from '../../../Common/Results/Result';

export interface SessionPreparer {
    prepareAsync(tabId: number, sessionId: string | null): Promise<Result<void>>;
}
