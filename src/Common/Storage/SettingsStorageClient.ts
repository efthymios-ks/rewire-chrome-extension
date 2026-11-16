import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import type { Result } from '../Results/Result';

export interface SettingsStorageClient {
    loadAsync(): Promise<Result<PanelSettings>>;
    saveAsync(settings: PanelSettings): Promise<Result<void>>;
    subscribe(listener: (settings: PanelSettings) => void): void;
}
