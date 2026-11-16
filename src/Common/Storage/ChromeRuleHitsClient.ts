import type { RuleHit } from '../../Contracts/Rules/RuleHit';
import { Result } from '../Results/Result';
import type { RuleHitsClient } from './RuleHitsClient';
import { STORAGE_AREA_NAMES } from './StorageAreaNames';
import { STORAGE_KEYS } from './StorageKeys';
import { subscribeToStorageKey } from './subscribeToStorageKey';

function isHit(value: unknown): value is RuleHit {
    if (typeof value !== 'object' || value == null) {
        return false;
    }

    const record = value as Record<string, unknown>;

    return typeof record['ruleId'] === 'string' && typeof record['count'] === 'number';
}

function asHits(value: unknown): RuleHit[] {
    return Array.isArray(value) ? value.filter(isHit) : [];
}

export class ChromeRuleHitsClient implements RuleHitsClient {
    loadAsync(): Promise<Result<RuleHit[]>> {
        return Result.attemptAsync(
            /* action: */ async () => {
                const stored = await chrome.storage.session.get(STORAGE_KEYS.RuleHits);

                return asHits(stored[STORAGE_KEYS.RuleHits]);
            },
            /* failurePrefix: */ 'Loading rule hit counts failed',
        );
    }

    saveAsync(hits: RuleHit[]): Promise<Result<void>> {
        return Result.attemptAsync(
            /* action: */ () => chrome.storage.session.set({
                [STORAGE_KEYS.RuleHits]: hits,
            }),
            /* failurePrefix: */ 'Saving rule hit counts failed',
        );
    }

    subscribe(listener: (hits: RuleHit[]) => void): void {
        subscribeToStorageKey({
            areaName: STORAGE_AREA_NAMES.Session,
            key: STORAGE_KEYS.RuleHits,
            listener: value => listener(asHits(value)),
        });
    }
}
