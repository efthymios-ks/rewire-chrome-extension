import { ConsoleLogger } from "../Common/Logging/ConsoleLogger";
import { RegexSupportClient } from "../Common/NetworkRules/RegexSupportClient";
import { RuleHitsClient } from "../Common/Storage/RuleHitsClient";
import { RuleSyncReportClient } from "../Common/Storage/RuleSyncReportClient";
import { RuleVariablesClient } from "../Common/Storage/RuleVariablesClient";
import { SettingsStorageClient } from "../Common/Storage/SettingsStorageClient";
import { ClipboardClient } from "./Core/ClipboardClient";
import { InspectedTabTracker } from "./Core/InspectedTabTracker";
import { Notifier } from "./Core/Notifier";
import { PanelStateFactory } from "./Core/PanelStateFactory";
import { RuleEditorLauncher } from "./Core/RuleEditorLauncher";
import { SettingsService } from "./Core/SettingsService";
import { Store } from "./Core/Store";
import { ThemeApplier } from "./Core/ThemeApplier";
import { ViewLauncher } from "./Core/ViewLauncher";
import { WorkerConnection } from "./Core/WorkerConnection";
import { CookieClient } from "./Features/Cookies/CookieClient";
import { EntryDetailLoader } from "./Features/Inspector/EntryDetailLoader";
import { CapturedVariablesSync } from "./Features/Profiles/Variables/CapturedVariablesSync";
import { RuleHitsSync } from "./Features/Rules/RuleHitsSync";
import { AppShell } from "./Features/Shell/AppShell";
import type { PanelContext } from "./Features/Shell/PanelContext";
import { RuleSyncReportSync } from "./Features/Shell/RuleSyncReportSync";
import { TimelineSync } from "./Features/Traffic/TimelineSync";
import { TrafficSearch } from "./Features/Traffic/TrafficSearch";

async function start(): Promise<void> {
    const logger = new ConsoleLogger();
    const store = new Store(PanelStateFactory.initial());
    const notifier = new Notifier(store);
    const connection = new WorkerConnection(logger);
    const settingsService = new SettingsService({
        store,
        storageClient: new SettingsStorageClient(),
        notifier,
        logger,
    });
    const timelineSync = new TimelineSync(store, connection);
    const trafficSearch = new TrafficSearch(store, connection);
    const context: PanelContext = {
        store,
        settingsService,
        timelineSync,
        trafficSearch,
        connection,
        notifier,
        ruleEditor: new RuleEditorLauncher(store),
        viewLauncher: new ViewLauncher(store),
        clipboardClient: new ClipboardClient(),
        cookieClient: new CookieClient(),
        regexSupportClient: new RegexSupportClient(),
    };

    await settingsService.initialize();
    await new RuleSyncReportSync(
        store,
        new RuleSyncReportClient(),
        logger
    ).start();
    await new RuleHitsSync(
        store,
        new RuleHitsClient(),
        logger
    ).start();
    await new CapturedVariablesSync(
        store,
        new RuleVariablesClient(),
        logger
    ).start();
    ThemeApplier.start(store);

    document.body.replaceChildren(new AppShell(context).root);

    timelineSync.start();
    trafficSearch.start();
    new EntryDetailLoader(store, connection).start();
    connection.start();

    await new InspectedTabTracker(logger).start({
        onChanged: tab => void timelineSync.inspect(tab),
        onUpdated: tab => timelineSync.updateTab(tab),
    });
}

void start();
