import type { LegacyCorsSettings } from './LegacyCorsSettings';
import type { LegacyHeaderInjection } from './LegacyHeaderInjection';
import type { LegacyInterceptionRule } from './LegacyInterceptionRule';
import type { LegacyRedirectRule } from './LegacyRedirectRule';

export interface LegacySettings {
    interceptionRules?: LegacyInterceptionRule[];
    redirectRules?: LegacyRedirectRule[];
    headerInjections?: LegacyHeaderInjection[];
    cors?: LegacyCorsSettings;
    regexTesterSamples?: string[];
}
