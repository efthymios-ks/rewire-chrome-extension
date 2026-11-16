import type { ProfileVariable } from '../../Contracts/Settings/ProfileVariable';
import { Result } from '../Results/Result';
import type { RuleVariablesClient } from './RuleVariablesClient';
import { STORAGE_AREA_NAMES } from './StorageAreaNames';
import { STORAGE_KEYS } from './StorageKeys';
import { subscribeToStorageKey } from './subscribeToStorageKey';

function isVariable(value: unknown): value is ProfileVariable {
    if (typeof value !== 'object' || value == null) {
        return false;
    }

    const record = value as Record<string, unknown>;

    return typeof record['name'] === 'string' && typeof record['value'] === 'string';
}

function asVariables(value: unknown): ProfileVariable[] {
    return Array.isArray(value) ? value.filter(isVariable) : [];
}

export class ChromeRuleVariablesClient implements RuleVariablesClient {
    loadAsync(): Promise<Result<ProfileVariable[]>> {
        return Result.attemptAsync(
            /* action: */ async () => {
                const stored = await chrome.storage.session.get(STORAGE_KEYS.RuleVariables);

                return asVariables(stored[STORAGE_KEYS.RuleVariables]);
            },
            /* failurePrefix: */ 'Loading captured variables failed',
        );
    }

    subscribe(listener: (variables: ProfileVariable[]) => void): void {
        subscribeToStorageKey({
            areaName: STORAGE_AREA_NAMES.Session,
            key: STORAGE_KEYS.RuleVariables,
            listener: value => listener(asVariables(value)),
        });
    }
}
