import { deepFreeze } from '../../Common/Objects/deepFreeze';
import { DEFAULT_PROFILE } from './DefaultProfile';
import type { PanelSettings } from './PanelSettings';
import { SETTINGS_SCHEMA } from './SettingsSchema';

export const DEFAULT_PANEL_SETTINGS: PanelSettings = deepFreeze({
    schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
    interceptionEnabled: true,
    pinnedEndpoints: [],
    activeProfileId: DEFAULT_PROFILE.id,
    profiles: [DEFAULT_PROFILE],
    testerSamples: [
        'https://api.example.com/api/v1/users/42/profile',
        'https://api.example.com/api/v1/users/profile?utm_source=mail',
    ],
});
