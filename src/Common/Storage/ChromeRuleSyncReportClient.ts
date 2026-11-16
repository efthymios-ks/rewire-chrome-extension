import type { RuleSyncFailure } from '../../Contracts/RuleSync/RuleSyncFailure';
import type { RuleSyncReport } from '../../Contracts/RuleSync/RuleSyncReport';
import { Result } from '../Results/Result';
import type { RuleSyncReportClient } from './RuleSyncReportClient';
import { STORAGE_AREA_NAMES } from './StorageAreaNames';
import { STORAGE_KEYS } from './StorageKeys';
import { subscribeToStorageKey } from './subscribeToStorageKey';

// Stored failures keep their rule id under `settingId`; the stored key must not change.
interface StoredRuleSyncFailure {
    sourceName: string;
    settingId: string;
    message: string;
}

interface StoredRuleSyncReport extends Omit<RuleSyncReport, 'failures'> {
    failures: StoredRuleSyncFailure[];
}

function failureOf(stored: StoredRuleSyncFailure): RuleSyncFailure {
    return {
        sourceName: stored.sourceName,
        ruleId: stored.settingId,
        message: stored.message,
    };
}

function storedFailureOf(failure: RuleSyncFailure): StoredRuleSyncFailure {
    return {
        sourceName: failure.sourceName,
        settingId: failure.ruleId,
        message: failure.message,
    };
}

function asReport(value: unknown): RuleSyncReport | null {
    if (typeof value !== 'object' || value == null) {
        return null;
    }

    const stored = value as StoredRuleSyncReport;

    return {
        ...stored,
        failures: (stored.failures ?? []).map(failureOf),
    };
}

export class ChromeRuleSyncReportClient implements RuleSyncReportClient {
    loadAsync(): Promise<Result<RuleSyncReport | null>> {
        return Result.attemptAsync(
            /* action: */ async () => {
                const stored = await chrome.storage.session.get(STORAGE_KEYS.RuleSyncReport);

                return asReport(stored[STORAGE_KEYS.RuleSyncReport]);
            },
            /* failurePrefix: */ 'Loading the rule sync report failed',
        );
    }

    saveAsync(report: RuleSyncReport): Promise<Result<void>> {
        const stored: StoredRuleSyncReport = {
            ...report,
            failures: report.failures.map(storedFailureOf),
        };

        return Result.attemptAsync(
            /* action: */ () => chrome.storage.session.set({
                [STORAGE_KEYS.RuleSyncReport]: stored,
            }),
            /* failurePrefix: */ 'Saving the rule sync report failed',
        );
    }

    subscribe(listener: (report: RuleSyncReport | null) => void): void {
        subscribeToStorageKey({
            areaName: STORAGE_AREA_NAMES.Session,
            key: STORAGE_KEYS.RuleSyncReport,
            listener: value => listener(asReport(value)),
        });
    }
}
