import type { RuleSyncReport } from '../../Contracts/RuleSync/RuleSyncReport';
import type { Result } from '../Results/Result';

export interface RuleSyncReportClient {
    loadAsync(): Promise<Result<RuleSyncReport | null>>;
    saveAsync(report: RuleSyncReport): Promise<Result<void>>;
    subscribe(listener: (report: RuleSyncReport | null) => void): void;
}
