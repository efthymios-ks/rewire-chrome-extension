import type { RuleSyncReport } from "../../Contracts/RuleSync/RuleSyncReport";
import type { Result } from "../Results/Result";

export interface IRuleSyncReportClient {
    load(): Promise<Result<RuleSyncReport | null>>;
    save(report: RuleSyncReport): Promise<Result<void>>;
    subscribe(listener: (report: RuleSyncReport | null) => void): void;
}
