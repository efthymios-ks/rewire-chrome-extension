import type { RegexSupportClient } from '../../../Common/NetworkRules/RegexSupportClient';
import type { ClipboardClient } from '../../Core/ClipboardClient';
import type { Notifier } from '../../Core/Notifier';
import type { PanelState } from '../../Core/PanelState';
import type { RuleEditorLauncher } from '../../Core/RuleEditorLauncher';
import type { SettingsService } from '../../Core/SettingsService';
import type { Store } from '../../Core/Store';
import type { TrafficFeatures } from '../../Core/TrafficFeatures';
import type { ViewLauncher } from '../../Core/ViewLauncher';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import type { CookieClient } from '../Cookies/CookieClient';
import type { TimelineSync } from '../Traffic/TimelineSync';
import type { TrafficSearch } from '../Traffic/TrafficSearch';

export interface PanelContext {
    store: Store<PanelState>;
    settingsService: SettingsService;
    timelineSync: TimelineSync;
    trafficSearch: TrafficSearch;
    connection: WorkerConnection;
    notifier: Notifier;
    ruleEditor: RuleEditorLauncher;
    viewLauncher: ViewLauncher;
    clipboardClient: ClipboardClient;
    cookieClient: CookieClient;
    regexSupportClient: RegexSupportClient;
    trafficFeatures: TrafficFeatures;
}
