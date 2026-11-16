import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import { Result } from '../Results/Result';
import type { SettingsStorageClient } from './SettingsStorageClient';
import { PanelSettingsNormalizer } from './PanelSettingsNormalizer';
import { STORAGE_AREA_NAMES } from './StorageAreaNames';
import { STORAGE_KEYS } from './StorageKeys';
import { subscribeToStorageKey } from './subscribeToStorageKey';

export class ChromeSettingsStorageClient implements SettingsStorageClient {
    async loadAsync(): Promise<Result<PanelSettings>> {
        const stored = await this.readStoredAsync();
        if (stored.hasErrors) {
            return stored;
        }

        const raw = stored.value;
        const settings = PanelSettingsNormalizer.normalize(raw);
        if (!PanelSettingsNormalizer.needsMigration(raw)) {
            return Result.ok(settings);
        }

        const migrated = await this.saveAsync(settings);

        return migrated.hasErrors ? migrated : Result.ok(settings);
    }

    saveAsync(settings: PanelSettings): Promise<Result<void>> {
        return Result.attemptAsync(
            /* action: */ () => chrome.storage.local.set({
                [STORAGE_KEYS.PanelSettings]: settings,
            }),
            /* failurePrefix: */ 'Saving settings failed',
        );
    }

    private readStoredAsync(): Promise<Result<unknown>> {
        return Result.attemptAsync(
            /* action: */ async () => {
                const stored = await chrome.storage.local.get(STORAGE_KEYS.PanelSettings);

                return stored[STORAGE_KEYS.PanelSettings];
            },
            /* failurePrefix: */ 'Loading settings failed',
        );
    }

    subscribe(listener: (settings: PanelSettings) => void): void {
        subscribeToStorageKey({
            areaName: STORAGE_AREA_NAMES.Local,
            key: STORAGE_KEYS.PanelSettings,
            listener: value => listener(PanelSettingsNormalizer.normalize(value)),
        });
    }
}
