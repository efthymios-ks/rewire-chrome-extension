import { ConsoleLogger } from '../Common/Logging/ConsoleLogger';
import { ChromeRegexSupportClient } from '../Common/NetworkRules/ChromeRegexSupportClient';
import { ChromeRuleHitsClient } from '../Common/Storage/ChromeRuleHitsClient';
import { ChromeRuleSyncReportClient } from '../Common/Storage/ChromeRuleSyncReportClient';
import { ChromeRuleVariablesClient } from '../Common/Storage/ChromeRuleVariablesClient';
import { ChromeSettingsStorageClient } from '../Common/Storage/ChromeSettingsStorageClient';
import { ChromeClipboardClient } from './Core/ChromeClipboardClient';
import { DefaultWorkerConnection } from './Core/DefaultWorkerConnection';
import { InspectedTabTracker } from './Core/InspectedTabTracker';
import { Notifier } from './Core/Notifier';
import { PanelStartup } from './Core/PanelStartup';
import { PanelStateFactory } from './Core/PanelStateFactory';
import { RuleEditorLauncher } from './Core/RuleEditorLauncher';
import { SettingsService } from './Core/SettingsService';
import { Store } from './Core/Store';
import { ThemeApplier } from './Core/ThemeApplier';
import { TRAFFIC_FEATURE_SETS } from './Core/TrafficFeatureSets';
import { ViewLauncher } from './Core/ViewLauncher';
import { ChromeCookieClient } from './Features/Cookies/ChromeCookieClient';
import { EntryDetailLoader } from './Features/Inspector/EntryDetailLoader';
import { CapturedVariablesSync } from './Features/Profiles/Variables/CapturedVariablesSync';
import { RuleHitsSync } from './Features/Rules/RuleHitsSync';
import { AppShell } from './Features/Shell/AppShell';
import type { PanelContext } from './Features/Shell/PanelContext';
import { RuleSyncReportSync } from './Features/Shell/RuleSyncReportSync';
import { TimelineSync } from './Features/Traffic/TimelineSync';
import { TrafficSearch } from './Features/Traffic/TrafficSearch';

const logger = new ConsoleLogger();

async function startAsync(): Promise<void> {
    const store = new Store(PanelStateFactory.initial());
    ThemeApplier.start(store);
    const notifier = new Notifier(store);
    const connection = new DefaultWorkerConnection(logger);
    const settingsService = new SettingsService({
        store,
        storageClient: new ChromeSettingsStorageClient(),
        notifier,
        logger,
    });
    const timelineSync = new TimelineSync({
        store,
        connection,
        notifier,
    });
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
        clipboardClient: new ChromeClipboardClient(),
        cookieClient: new ChromeCookieClient(),
        regexSupportClient: new ChromeRegexSupportClient(),
        trafficFeatures: TRAFFIC_FEATURE_SETS.Live,
    };

    await settingsService.initializeAsync();
    await new RuleSyncReportSync({
        store,
        reportClient: new ChromeRuleSyncReportClient(),
        logger,
    }).startAsync();
    await new RuleHitsSync({
        store,
        hitsClient: new ChromeRuleHitsClient(),
        logger,
    }).startAsync();
    await new CapturedVariablesSync({
        store,
        variablesClient: new ChromeRuleVariablesClient(),
        logger,
    }).startAsync();

    document.body.replaceChildren(new AppShell(context).root);

    timelineSync.start();
    trafficSearch.start();
    new EntryDetailLoader(store, connection).start();
    connection.start();

    await new InspectedTabTracker(logger).startAsync({
        onChanged: tab => void timelineSync.inspectAsync(tab),
        onUpdated: tab => timelineSync.updateTab(tab),
    });
}

void PanelStartup.runAsync({
    logger,
    root: document.body,
    task: startAsync,
});
