import type { IRegexSupportClient } from "../../../Common/NetworkRules/RegexSupportClient";
import type { IClipboardClient } from "../../Core/ClipboardClient";
import type { Notifier } from "../../Core/Notifier";
import type { PanelState } from "../../Core/PanelState";
import type { RuleEditorLauncher } from "../../Core/RuleEditorLauncher";
import type { SettingsService } from "../../Core/SettingsService";
import type { Store } from "../../Core/Store";
import type { ViewLauncher } from "../../Core/ViewLauncher";
import type { IWorkerConnection } from "../../Core/WorkerConnection";
import type { ICookieClient } from "../Cookies/CookieClient";
import type { TimelineSync } from "../Traffic/TimelineSync";
import type { TrafficSearch } from "../Traffic/TrafficSearch";

export interface PanelContext {
    store: Store<PanelState>;
    settingsService: SettingsService;
    timelineSync: TimelineSync;
    trafficSearch: TrafficSearch;
    connection: IWorkerConnection;
    notifier: Notifier;
    ruleEditor: RuleEditorLauncher;
    viewLauncher: ViewLauncher;
    clipboardClient: IClipboardClient;
    cookieClient: ICookieClient;
    regexSupportClient: IRegexSupportClient;
}
