import type { PanelSettings } from "../../../Contracts/Settings/PanelSettings";

export interface ISettingsCache {
    current(): PanelSettings;
}
