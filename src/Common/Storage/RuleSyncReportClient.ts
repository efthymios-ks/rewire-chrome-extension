import type { RuleSyncReport } from "../../Contracts/RuleSync/RuleSyncReport";
import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";
import type { IRuleSyncReportClient } from "./IRuleSyncReportClient";
import { StorageAreaNames, StorageKeys } from "./StorageKeys";

function asReport(value: unknown): RuleSyncReport | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    return value as RuleSyncReport;
}

export class RuleSyncReportClient implements IRuleSyncReportClient {
    async load(): Promise<Result<RuleSyncReport | null>> {
        try {
            const stored = await chrome.storage.session.get(StorageKeys.RuleSyncReport);

            return Result.ok(asReport(stored[StorageKeys.RuleSyncReport]));
        } catch (error) {
            return Result.fail(`Loading the rule sync report failed: ${ErrorText.of(error)}`);
        }
    }

    async save(report: RuleSyncReport): Promise<Result<void>> {
        try {
            await chrome.storage.session.set({
                [StorageKeys.RuleSyncReport]: report,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(`Saving the rule sync report failed: ${ErrorText.of(error)}`);
        }
    }

    subscribe(listener: (report: RuleSyncReport | null) => void): void {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            const change = changes[StorageKeys.RuleSyncReport];
            if (areaName !== StorageAreaNames.Session || change === undefined) {
                return;
            }

            listener(asReport(change.newValue));
        });
    }
}
