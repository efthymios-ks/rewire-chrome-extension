import type { ILogger } from "../../../Common/Logging/ILogger";
import type { ISettingsStorageClient } from "../../../Common/Storage/ISettingsStorageClient";
import { DefaultPanelSettings } from "../../../Contracts/Settings/DefaultPanelSettings";
import type { PanelSettings } from "../../../Contracts/Settings/PanelSettings";
import type { ISettingsCache } from "./ISettingsCache";

export class SettingsCache implements ISettingsCache {
    private readonly _storageClient: ISettingsStorageClient;
    private readonly _logger: ILogger;
    private readonly _listeners: Array<(settings: PanelSettings) => void> = [];
    private _settings: PanelSettings = DefaultPanelSettings;

    constructor(storageClient: ISettingsStorageClient, logger: ILogger) {
        this._storageClient = storageClient;
        this._logger = logger;
    }

    async initialize(): Promise<void> {
        this._storageClient.subscribe(settings => this.apply(settings));

        const loaded = await this._storageClient.load();
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
