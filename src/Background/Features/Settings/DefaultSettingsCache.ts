import type { Logger } from '../../../Common/Logging/Logger';
import type { SettingsStorageClient } from '../../../Common/Storage/SettingsStorageClient';
import { DEFAULT_PANEL_SETTINGS } from '../../../Contracts/Settings/DefaultPanelSettings';
import type { PanelSettings } from '../../../Contracts/Settings/PanelSettings';
import type { SettingsCache } from './SettingsCache';

export class DefaultSettingsCache implements SettingsCache {
    private readonly _storageClient: SettingsStorageClient;
    private readonly _logger: Logger;
    private readonly _listeners: Array<(settings: PanelSettings) => void> = [];
    private _settings: PanelSettings = DEFAULT_PANEL_SETTINGS;

    constructor(storageClient: SettingsStorageClient, logger: Logger) {
        this._storageClient = storageClient;
        this._logger = logger;
    }

    async initializeAsync(): Promise<void> {
        this._storageClient.subscribe(settings => this.apply(settings));

        const loaded = await this._storageClient.loadAsync();
        if (loaded.hasErrors) {
            this._logger.error(loaded.error);

            return;
        }

        this._settings = loaded.value;
    }

    current(): PanelSettings {
        return this._settings;
    }

    subscribe(listener: (settings: PanelSettings) => void): void {
        this._listeners.push(listener);
    }

    watch<TSlice>(selector: (settings: PanelSettings) => TSlice, onChange: () => void): void {
        let lastJson = JSON.stringify(selector(this._settings));
        this.subscribe(settings => {
            const json = JSON.stringify(selector(settings));
            if (json === lastJson) {
                return;
            }

            lastJson = json;
            onChange();
        });
    }

    private apply(settings: PanelSettings): void {
        this._settings = settings;
        this._listeners.forEach(listener => listener(settings));
    }
}
