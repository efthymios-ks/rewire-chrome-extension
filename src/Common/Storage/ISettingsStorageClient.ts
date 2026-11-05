import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import type { Result } from "../Results/Result";

export interface ISettingsStorageClient {
    load(): Promise<Result<PanelSettings>>;
    save(settings: PanelSettings): Promise<Result<void>>;
    subscribe(listener: (settings: PanelSettings) => void): void;
}
