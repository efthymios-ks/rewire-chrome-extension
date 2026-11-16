import type { PanelSettings } from '../../../Contracts/Settings/PanelSettings';

export interface SettingsCache {
    current(): PanelSettings;
}
