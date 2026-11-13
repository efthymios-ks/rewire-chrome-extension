import { BackgroundTask } from "../Common/Async/BackgroundTask";
import { ContentKindClassifier } from "../Common/Content/ContentKindClassifier";
import { ActiveProfile } from "../Common/Profiles/ActiveProfile";
import { ConsoleLogger } from "../Common/Logging/ConsoleLogger";
import { RegexSupportClient } from "../Common/NetworkRules/RegexSupportClient";
import { RuleHitsClient } from "../Common/Storage/RuleHitsClient";
import { RuleSyncReportClient } from "../Common/Storage/RuleSyncReportClient";
import { SettingsStorageClient } from "../Common/Storage/SettingsStorageClient";
import { InspectionState } from "../Contracts/Inspection/InspectionState";
import { PanelPortName } from "../Contracts/Messaging/PanelPortName";
import { WorkerEventType } from "../Contracts/Messaging/WorkerEventType";
import { ClearTimelineEndpoint } from "./Endpoints/ClearTimeline/ClearTimelineEndpoint";
import { GetEntryDetailEndpoint } from "./Endpoints/GetEntryDetail/GetEntryDetailEndpoint";
import { GetTimelineDetailsEndpoint } from "./Endpoints/GetTimelineDetails/GetTimelineDetailsEndpoint";
import { InspectTabEndpoint } from "./Endpoints/InspectTab/InspectTabEndpoint";
import { KeepAliveEndpoint } from "./Endpoints/KeepAlive/KeepAliveEndpoint";
import { LogClientExchangeEndpoint } from "./Endpoints/LogClientExchange/LogClientExchangeEndpoint";
import { PanelEndpointRouter } from "./Endpoints/PanelEndpointRouter";
import { RemoveLiveChannelsEndpoint } from "./Endpoints/RemoveLiveChannels/RemoveLiveChannelsEndpoint";
import { SearchTimelineEndpoint } from "./Endpoints/SearchTimeline/SearchTimelineEndpoint";
import { SendClientRequestEndpoint } from "./Endpoints/SendClientRequest/SendClientRequestEndpoint";
import { SendPostMessageEndpoint } from "./Endpoints/SendPostMessage/SendPostMessageEndpoint";
import { SetLiveListeningEndpoint } from "./Endpoints/SetLiveListening/SetLiveListeningEndpoint";
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
import { ClientRequestSender } from "./Features/ClientSending/ClientRequestSender";
import { PanelTargetClient } from "./Features/ClientSending/PanelTargetClient";
import { CdpEventDispatcher } from "./Features/Debugging/CdpEventDispatcher";
import { DebuggerClient } from "./Features/Debugging/DebuggerClient";
import { DebuggerSessions } from "./Features/Debugging/DebuggerSessions";
import { FrameRegistry } from "./Features/Frames/FrameRegistry";
import { InspectionService } from "./Features/Inspection/InspectionService";
import { RequestPausedHandler } from "./Features/Interception/RequestPausedHandler";
import { EventSourceMessageHandler } from "./Features/Live/EventSourceMessageHandler";
import { EventSourceRequestHandler } from "./Features/Live/EventSourceRequestHandler";
import { EventStreamEndedHandler } from "./Features/Live/EventStreamEndedHandler";
import { EventStreamParsers } from "./Features/Live/EventStreamParsers";
import { FetchStreamDataHandler } from "./Features/Live/FetchStreamDataHandler";
import { FetchStreamResponseHandler } from "./Features/Live/FetchStreamResponseHandler";
import { ListeningGate } from "./Features/Live/ListeningGate";
import { LiveListeningRegistry } from "./Features/Live/LiveListeningRegistry";
import { LiveListeningService } from "./Features/Live/LiveListeningService";
import { LiveStore } from "./Features/Live/LiveStore";
import { WebSocketClosedHandler } from "./Features/Live/WebSocketClosedHandler";
import { WebSocketCreatedHandler } from "./Features/Live/WebSocketCreatedHandler";
import { WebSocketFrameReceivedHandler } from "./Features/Live/WebSocketFrameReceivedHandler";
import { WebSocketFrameSentHandler } from "./Features/Live/WebSocketFrameSentHandler";
import { DeclarativeNetRequestClient } from "./Features/NetworkRules/DeclarativeNetRequestClient";
import { DeclarativeRuleSync } from "./Features/NetworkRules/DeclarativeRuleSync";
import { DnrFeedbackClient } from "./Features/NetworkRules/DnrFeedbackClient";
import { TimeWindowAlarmName, TimeWindowScheduler } from "./Features/NetworkRules/TimeWindowScheduler";
import type { PanelConnection } from "./Features/PanelConnections/PanelConnection";
import { PanelConnectionHub } from "./Features/PanelConnections/PanelConnectionHub";
import { PostMessageBindingHandler } from "./Features/PostMessages/PostMessageBindingHandler";
import { PostMessageProbeInstaller } from "./Features/PostMessages/PostMessageProbeInstaller";
import { PostMessageSender } from "./Features/PostMessages/PostMessageSender";
import { PostMessageSessionStep } from "./Features/PostMessages/PostMessageSessionStep";
import { ActiveRules } from "./Features/Rules/ActiveRules";
import { RuleHitCounter } from "./Features/Rules/RuleHitCounter";
import { VariableStore } from "./Features/Rules/VariableStore";
import { ChildSessionAttachedHandler } from "./Features/Sessions/ChildSessionAttachedHandler";
import { ChildSessionDetachedHandler } from "./Features/Sessions/ChildSessionDetachedHandler";
import { FrameAutoAttachSessionStep } from "./Features/Sessions/FrameAutoAttachSessionStep";
import { InterceptionSessionStep } from "./Features/Sessions/InterceptionSessionStep";
import { NetworkSessionStep } from "./Features/Sessions/NetworkSessionStep";
import { SessionPreparer } from "./Features/Sessions/SessionPreparer";
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
const debuggerSessions = new DebuggerSessions();
const frameRegistry = new FrameRegistry();
const debuggerClient = new DebuggerClient(debuggerSessions);
const interceptionStep = new InterceptionSessionStep(debuggerClient, activeRules);
const liveListeningRegistry = new LiveListeningRegistry();
const postMessageInstaller = new PostMessageProbeInstaller(debuggerClient);
const sessionPreparer = new SessionPreparer(
    [
        new NetworkSessionStep(debuggerClient),
        interceptionStep,
        new FrameAutoAttachSessionStep(debuggerClient),
        new PostMessageSessionStep(postMessageInstaller, liveListeningRegistry),
    ],
    logger
);
const connectionHub = new PanelConnectionHub(logger);
const timelineStore = new TimelineStore();
const liveStore = new LiveStore();
const eventStreamParsers = new EventStreamParsers();
const now = (): Date => new Date();
const contentKindClassifier = new ContentKindClassifier();
const recordClassifier = new TimelineRecordClassifier(contentKindClassifier);
const browserRuleSimulator = new BrowserRuleSimulator(activeRules);
const clientRequestSender = new ClientRequestSender(new PanelTargetClient(), logger);
const postMessageSender = new PostMessageSender(debuggerClient, () => Date.now());

const liveListening = new LiveListeningService({
    registry: liveListeningRegistry,
    installer: postMessageInstaller,
    sessions: debuggerSessions,
    isAttached: tabId => inspectionService.statusOf(tabId).state === InspectionState.Attached,
    logger,
});

const inspectionService = new InspectionService({
    debuggerClient,
    preparer: sessionPreparer,
    interception: interceptionStep,
    sessions: debuggerSessions,
    frameRegistry,
    connectionHub,
    timelineStore,
    liveStore,
    liveListening,
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

const cdpEventDispatcher = new CdpEventDispatcher(debuggerSessions)
    .register(new RequestWillBeSentHandler({
        timelineStore,
        pendingDocuments,
        admission,
        captureFilter,
        recordFactory: new TimelineRecordFactory(recordClassifier, frameRegistry),
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
    }))
    .register(new ChildSessionAttachedHandler({
        debuggerClient,
        sessions: debuggerSessions,
        preparer: sessionPreparer,
        logger,
    }))
    .register(new ChildSessionDetachedHandler(debuggerSessions))
    .register(new ListeningGate(
        new WebSocketCreatedHandler(liveStore, now),
        liveListeningRegistry,
        "webSockets"
    ))
    .register(new ListeningGate(
        new WebSocketFrameSentHandler(liveStore, now),
        liveListeningRegistry,
        "webSockets"
    ))
    .register(new ListeningGate(
        new WebSocketFrameReceivedHandler(liveStore, now),
        liveListeningRegistry,
        "webSockets"
    ))
    .register(new WebSocketClosedHandler(liveStore))
    .register(new ListeningGate(
        new EventSourceRequestHandler(liveStore, now),
        liveListeningRegistry,
        "eventStreams"
    ))
    .register(new ListeningGate(
        new EventSourceMessageHandler(liveStore, now),
        liveListeningRegistry,
        "eventStreams"
    ))
    .register(new ListeningGate(
        new FetchStreamResponseHandler({
            liveStore,
            parsers: eventStreamParsers,
            timelineStore,
            connectionHub,
            debuggerClient,
            logger,
            now,
        }),
        liveListeningRegistry,
        "eventStreams"
    ))
    .register(new FetchStreamDataHandler(
        liveStore,
        eventStreamParsers,
        now
    ))
    .register(new EventStreamEndedHandler(
        "Network.loadingFinished",
        liveStore,
        eventStreamParsers
    ))
    .register(new EventStreamEndedHandler(
        "Network.loadingFailed",
        liveStore,
        eventStreamParsers
    ))
    .register(new ListeningGate(
        new PostMessageBindingHandler(
            liveStore,
            postMessageSender,
            now
        ),
        liveListeningRegistry,
        "postMessages"
    ));

const endpointRouter = new PanelEndpointRouter()
    .register(new InspectTabEndpoint(
        inspectionService,
        timelineStore,
        liveStore
    ))
    .register(new GetEntryDetailEndpoint(timelineStore))
    .register(new GetTimelineDetailsEndpoint(timelineStore))
    .register(new ClearTimelineEndpoint(timelineStore, connectionHub))
    .register(new SearchTimelineEndpoint(timelineStore))
    .register(new KeepAliveEndpoint())
    .register(new LogClientExchangeEndpoint(timelineStore, contentKindClassifier))
    .register(new SendClientRequestEndpoint(clientRequestSender))
    .register(new SendPostMessageEndpoint(postMessageSender))
    .register(new RemoveLiveChannelsEndpoint(liveStore))
    .register(new SetLiveListeningEndpoint(liveListening));

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

liveStore.subscribe((tabId, event) => connectionHub.publishToTab(tabId, event));

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
        rules: ActiveProfile.rules(settings),
        variables: ActiveProfile.variables(settings),
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
) => {
    if (source.targetId !== undefined) {
        clientRequestSender.handleEvent(
            source.targetId,
            method,
            params
        );

        return;
    }

    BackgroundTask.run(
        logger,
        method,
        async () => {
            await settingsReady;
            await cdpEventDispatcher.dispatch(
                source,
                method,
                params
            );
        }
    );
});

chrome.debugger.onDetach.addListener((source, reason) => {
    if (source.targetId !== undefined) {
        clientRequestSender.handleDetach(source.targetId);

        return;
    }

    if (source.tabId === undefined) {
        return;
    }

    inspectionService.handleDetach(source.tabId, reason);
});

chrome.tabs.onRemoved.addListener(tabId => inspectionService.forget(tabId));

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
