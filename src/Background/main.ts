import { BackgroundTask } from "../Common/Async/BackgroundTask";
import { ContentKindClassifier } from "../Common/Content/ContentKindClassifier";
import { ConsoleLogger } from "../Common/Logging/ConsoleLogger";
import { RegexSupportClient } from "../Common/NetworkRules/RegexSupportClient";
import { RuleHitsClient } from "../Common/Storage/RuleHitsClient";
import { RuleSyncReportClient } from "../Common/Storage/RuleSyncReportClient";
import { SettingsStorageClient } from "../Common/Storage/SettingsStorageClient";
import { PanelPortName } from "../Contracts/Messaging/PanelPortName";
import { WorkerEventType } from "../Contracts/Messaging/WorkerEventType";
import { ClearTimelineEndpoint } from "./Endpoints/ClearTimeline/ClearTimelineEndpoint";
import { GetEntryDetailEndpoint } from "./Endpoints/GetEntryDetail/GetEntryDetailEndpoint";
import { InspectTabEndpoint } from "./Endpoints/InspectTab/InspectTabEndpoint";
import { KeepAliveEndpoint } from "./Endpoints/KeepAlive/KeepAliveEndpoint";
import { LogClientExchangeEndpoint } from "./Endpoints/LogClientExchange/LogClientExchangeEndpoint";
import { PanelEndpointRouter } from "./Endpoints/PanelEndpointRouter";
import { SearchTimelineEndpoint } from "./Endpoints/SearchTimeline/SearchTimelineEndpoint";
import { BrowserRuleSimulator } from "./Features/Capture/BrowserRuleSimulator";
import { CaptureFilter } from "./Features/Capture/CaptureFilter";
import { LoadingFailedHandler } from "./Features/Capture/LoadingFailedHandler";
import { LoadingFinishedHandler } from "./Features/Capture/LoadingFinishedHandler";
import { PendingDocuments } from "./Features/Capture/PendingDocuments";
import { RequestExtraInfoHandler } from "./Features/Capture/RequestExtraInfoHandler";
import { RequestWillBeSentHandler } from "./Features/Capture/RequestWillBeSentHandler";
import { ResponseBodyReader } from "./Features/Capture/ResponseBodyReader";
import { ResponseExtraInfoHandler } from "./Features/Capture/ResponseExtraInfoHandler";
import { ResponseReceivedHandler } from "./Features/Capture/ResponseReceivedHandler";
import { TimelineAdmission } from "./Features/Capture/TimelineAdmission";
import { TimelineRecordClassifier } from "./Features/Capture/TimelineRecordClassifier";
import { TimelineRecordFactory } from "./Features/Capture/TimelineRecordFactory";
import { TimelineStore } from "./Features/Capture/TimelineStore";
import { CdpEventDispatcher } from "./Features/Debugging/CdpEventDispatcher";
import { DebuggerClient } from "./Features/Debugging/DebuggerClient";
import { InspectionService } from "./Features/Inspection/InspectionService";
import { RequestPausedHandler } from "./Features/Interception/RequestPausedHandler";
import { DeclarativeNetRequestClient } from "./Features/NetworkRules/DeclarativeNetRequestClient";
import { DeclarativeRuleSync } from "./Features/NetworkRules/DeclarativeRuleSync";
import { DnrFeedbackClient } from "./Features/NetworkRules/DnrFeedbackClient";
import { TimeWindowAlarmName, TimeWindowScheduler } from "./Features/NetworkRules/TimeWindowScheduler";
import type { PanelConnection } from "./Features/PanelConnections/PanelConnection";
import { PanelConnectionHub } from "./Features/PanelConnections/PanelConnectionHub";
import { ActiveRules } from "./Features/Rules/ActiveRules";
import { RuleHitCounter } from "./Features/Rules/RuleHitCounter";
import { VariableStore } from "./Features/Rules/VariableStore";
import { SettingsCache } from "./Features/Settings/SettingsCache";
import { SidePanelClient } from "./Features/SidePanel/SidePanelClient";

const logger = new ConsoleLogger();
const settingsCache = new SettingsCache(new SettingsStorageClient(), logger);
const variableStore = new VariableStore(logger);
const activeRules = new ActiveRules(settingsCache, variableStore);
const hitCounter = new RuleHitCounter(
    new DnrFeedbackClient(),
    new RuleHitsClient(),
    logger
);
const debuggerClient = new DebuggerClient();
const connectionHub = new PanelConnectionHub(logger);
const timelineStore = new TimelineStore();
const contentKindClassifier = new ContentKindClassifier();
const recordClassifier = new TimelineRecordClassifier(contentKindClassifier);
const browserRuleSimulator = new BrowserRuleSimulator(activeRules);

const inspectionService = new InspectionService({
    debuggerClient,
    activeRules,
    connectionHub,
    timelineStore,
    logger,
});

const ruleSync = new DeclarativeRuleSync({
    activeRules,
    netRequestClient: new DeclarativeNetRequestClient(new RegexSupportClient()),
    reportClient: new RuleSyncReportClient(),
    hitCounter,
    timeWindowScheduler: new TimeWindowScheduler(logger),
    logger,
});

const captureFilter = new CaptureFilter();
const pendingDocuments = new PendingDocuments();
const admission = new TimelineAdmission(timelineStore, browserRuleSimulator);

const cdpEventDispatcher = new CdpEventDispatcher()
    .register(new RequestWillBeSentHandler({
        timelineStore,
        pendingDocuments,
        admission,
        captureFilter,
        recordFactory: new TimelineRecordFactory(recordClassifier),
        recordClassifier,
        browserRuleSimulator,
        debuggerClient,
        logger,
    }))
    .register(new RequestExtraInfoHandler(timelineStore))
    .register(new ResponseReceivedHandler({
        timelineStore,
        pendingDocuments,
        admission,
        captureFilter,
        recordClassifier,
        browserRuleSimulator,
    }))
    .register(new ResponseExtraInfoHandler(timelineStore))
    .register(new LoadingFinishedHandler(timelineStore, new ResponseBodyReader(debuggerClient)))
    .register(new LoadingFailedHandler({
        timelineStore,
        pendingDocuments,
        admission,
        browserRuleSimulator,
    }))
    .register(new RequestPausedHandler({
        activeRules,
        debuggerClient,
        timelineStore,
        pendingDocuments,
        hitCounter,
        logger,
    }));

const endpointRouter = new PanelEndpointRouter()
    .register(new InspectTabEndpoint(inspectionService, timelineStore))
    .register(new GetEntryDetailEndpoint(timelineStore))
    .register(new ClearTimelineEndpoint(timelineStore, connectionHub))
    .register(new SearchTimelineEndpoint(timelineStore))
    .register(new KeepAliveEndpoint())
    .register(new LogClientExchangeEndpoint(timelineStore, contentKindClassifier));

activeRules.subscribe(() => {
    BackgroundTask.run(
        logger,
        "Network rule sync",
        () => ruleSync.sync()
    );
    BackgroundTask.run(
        logger,
        "Interception refresh",
        () => inspectionService.refreshInterception()
    );
});

const settingsReady = (async () => {
    await hitCounter.initialize();
    await settingsCache.initialize();
    await variableStore.initialize();
    activeRules.refresh();
})();

async function syncNetworkRules(): Promise<void> {
    await settingsReady;
    await ruleSync.sync();
}

async function handlePanelMessage(connection: PanelConnection, message: unknown): Promise<void> {
    if (!endpointRouter.isPanelRequest(message)) {
        logger.warn("Ignored a malformed panel message.", message);

        return;
    }

    await settingsReady;
    const result = await endpointRouter.route(
        message,
        {
            connection,
        }
    );
    connectionHub.send(
        connection,
        {
            type: WorkerEventType.CommandCompleted,
            correlationId: message.correlationId,
            result,
        }
    );
}

timelineStore.subscribe(entry => connectionHub.publishToTab(
    entry.tabId,
    {
        type: WorkerEventType.EntryUpserted,
        entry,
    }
));

settingsCache.watch(
    settings => ({
        interceptionEnabled: settings.interceptionEnabled,
        rules: settings.rules,
    }),
    () => activeRules.refresh()
);

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== TimeWindowAlarmName) {
        return;
    }

    BackgroundTask.run(
        logger,
        "Time window refresh",
        async () => {
            await settingsReady;
            activeRules.refresh();
        }
    );
});

chrome.runtime.onInstalled.addListener(() => BackgroundTask.run(
    logger,
    "Network rule sync",
    syncNetworkRules
));
chrome.runtime.onStartup.addListener(() => BackgroundTask.run(
    logger,
    "Network rule sync",
    syncNetworkRules
));

chrome.debugger.onEvent.addListener((
    source,
    method,
    params
) => BackgroundTask.run(
    logger,
    method,
    async () => {
        await settingsReady;
        await cdpEventDispatcher.dispatch(
            source.tabId,
            method,
            params
        );
    }
));

chrome.debugger.onDetach.addListener((source, reason) => {
    if (source.tabId === undefined) {
        return;
    }

    inspectionService.handleDetach(source.tabId, reason);
});

chrome.runtime.onConnect.addListener(port => {
    if (port.name !== PanelPortName) {
        return;
    }

    const connection = connectionHub.add(port);
    hitCounter.startPolling();
    port.onMessage.addListener(message => BackgroundTask.run(
        logger,
        "Panel command",
        () => handlePanelMessage(connection, message)
    ));
    port.onDisconnect.addListener(() => {
        connectionHub.remove(connection.id);
        if (!connectionHub.hasConnections()) {
            hitCounter.stopPolling();
        }

        BackgroundTask.run(
            logger,
            "Panel release",
            () => inspectionService.release(connection.tabId)
        );
    });
});

BackgroundTask.run(
    logger,
    "Side panel setup",
    async () => {
        const configured = await new SidePanelClient().openOnToolbarClick();
        if (configured.hasErrors) {
            logger.error(configured.error);
        }
    }
);
