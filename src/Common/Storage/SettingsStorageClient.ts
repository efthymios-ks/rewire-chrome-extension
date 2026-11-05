import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";
import type { ISettingsStorageClient } from "./ISettingsStorageClient";
import { PanelSettingsNormalizer } from "./PanelSettingsNormalizer";
import { StorageAreaNames, StorageKeys } from "./StorageKeys";

export class SettingsStorageClient implements ISettingsStorageClient {
    async load(): Promise<Result<PanelSettings>> {
        let raw: unknown;
        try {
            const stored = await chrome.storage.local.get(StorageKeys.PanelSettings);
            raw = stored[StorageKeys.PanelSettings];
        } catch (error) {
            return Result.fail(`Loading settings failed: ${ErrorText.of(error)}`);
        }

        const settings = PanelSettingsNormalizer.normalize(raw);
        if (!PanelSettingsNormalizer.needsMigration(raw)) {
            return Result.ok(settings);
        }

        const migrated = await this.save(settings);

        return migrated.hasErrors ? migrated : Result.ok(settings);
    }

    async save(settings: PanelSettings): Promise<Result<void>> {
        try {
            await chrome.storage.local.set({
                [StorageKeys.PanelSettings]: settings,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(`Saving settings failed: ${ErrorText.of(error)}`);
        }
    }

    subscribe(listener: (settings: PanelSettings) => void): void {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            const change = changes[StorageKeys.PanelSettings];
            if (areaName !== StorageAreaNames.Local || change === undefined) {
                return;
            }

            listener(PanelSettingsNormalizer.normalize(change.newValue));
        });
    }
}
