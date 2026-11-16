import { BackgroundTask } from '../Common/Async/BackgroundTask';
import { DefaultContentKindClassifier } from '../Common/Content/DefaultContentKindClassifier';
import { ChromeRegexSupportClient } from '../Common/NetworkRules/ChromeRegexSupportClient';
import { ActiveProfile } from '../Common/Profiles/ActiveProfile';
import { ConsoleLogger } from '../Common/Logging/ConsoleLogger';
import { ChromeRuleHitsClient } from '../Common/Storage/ChromeRuleHitsClient';
import { ChromeRuleSyncReportClient } from '../Common/Storage/ChromeRuleSyncReportClient';
import { ChromeSettingsStorageClient } from '../Common/Storage/ChromeSettingsStorageClient';
import { INSPECTION_STATE } from '../Contracts/Inspection/InspectionState';
import { PANEL_PORT_NAME } from '../Contracts/Messaging/PanelPortName';
import { WORKER_EVENT_TYPE } from '../Contracts/Messaging/WorkerEventType';
import { ClearTimelineEndpoint } from './Endpoints/ClearTimeline/ClearTimelineEndpoint';
import { GetEntryDetailEndpoint } from './Endpoints/GetEntryDetail/GetEntryDetailEndpoint';
import { GetTimelineDetailsEndpoint } from './Endpoints/GetTimelineDetails/GetTimelineDetailsEndpoint';
import { InspectTabEndpoint } from './Endpoints/InspectTab/InspectTabEndpoint';
import { KeepAliveEndpoint } from './Endpoints/KeepAlive/KeepAliveEndpoint';
import { LogClientExchangeEndpoint } from './Endpoints/LogClientExchange/LogClientExchangeEndpoint';
import { PanelEndpointRouter } from './Endpoints/PanelEndpointRouter';
import { RemoveLiveChannelsEndpoint } from './Endpoints/RemoveLiveChannels/RemoveLiveChannelsEndpoint';
import { SearchTimelineEndpoint } from './Endpoints/SearchTimeline/SearchTimelineEndpoint';
import { SendClientRequestEndpoint } from './Endpoints/SendClientRequest/SendClientRequestEndpoint';
import { SendPostMessageEndpoint } from './Endpoints/SendPostMessage/SendPostMessageEndpoint';
import { SetLiveListeningEndpoint } from './Endpoints/SetLiveListening/SetLiveListeningEndpoint';
import { DefaultBrowserRuleSimulator } from './Features/Capture/DefaultBrowserRuleSimulator';
import { DefaultCaptureFilter } from './Features/Capture/DefaultCaptureFilter';
import { DefaultResponseBodyReader } from './Features/Capture/DefaultResponseBodyReader';
import { DefaultTimelineAdmission } from './Features/Capture/DefaultTimelineAdmission';
import { DefaultTimelineRecordClassifier } from './Features/Capture/DefaultTimelineRecordClassifier';
import { DefaultTimelineRecordFactory } from './Features/Capture/DefaultTimelineRecordFactory';
import { LoadingFailedHandler } from './Features/Capture/LoadingFailedHandler';
import { LoadingFinishedHandler } from './Features/Capture/LoadingFinishedHandler';
import { RequestExtraInfoHandler } from './Features/Capture/RequestExtraInfoHandler';
import { RequestWillBeSentHandler } from './Features/Capture/RequestWillBeSentHandler';
import { ResponseExtraInfoHandler } from './Features/Capture/ResponseExtraInfoHandler';
import { ResponseReceivedHandler } from './Features/Capture/ResponseReceivedHandler';
import { DefaultTimelineStore } from './Features/Capture/DefaultTimelineStore';
import { ChromePanelTargetClient } from './Features/ClientSending/ChromePanelTargetClient';
import { DefaultClientRequestSender } from './Features/ClientSending/DefaultClientRequestSender';
import { CdpEventDispatcher } from './Features/Debugging/CdpEventDispatcher';
import { ChromeDebuggerClient } from './Features/Debugging/ChromeDebuggerClient';
import { DefaultDebuggerSessions } from './Features/Debugging/DefaultDebuggerSessions';
import { DefaultFrameRegistry } from './Features/Frames/DefaultFrameRegistry';
import { DefaultInspectionService } from './Features/Inspection/DefaultInspectionService';
import { RequestPausedHandler } from './Features/Interception/RequestPausedHandler';
import { DefaultEventStreamParsers } from './Features/Live/DefaultEventStreamParsers';
import { DefaultLiveListeningRegistry } from './Features/Live/DefaultLiveListeningRegistry';
import { DefaultLiveListeningService } from './Features/Live/DefaultLiveListeningService';
import { DefaultLiveStore } from './Features/Live/DefaultLiveStore';
import { EventSourceMessageHandler } from './Features/Live/EventSourceMessageHandler';
import { EventSourceRequestHandler } from './Features/Live/EventSourceRequestHandler';
import { EventStreamEndedHandler } from './Features/Live/EventStreamEndedHandler';
import { FetchStreamDataHandler } from './Features/Live/FetchStreamDataHandler';
import { FetchStreamResponseHandler } from './Features/Live/FetchStreamResponseHandler';
import { ListeningGate } from './Features/Live/ListeningGate';
import { WebSocketClosedHandler } from './Features/Live/WebSocketClosedHandler';
import { WebSocketCreatedHandler } from './Features/Live/WebSocketCreatedHandler';
import { WebSocketFrameReceivedHandler } from './Features/Live/WebSocketFrameReceivedHandler';
import { WebSocketFrameSentHandler } from './Features/Live/WebSocketFrameSentHandler';
import { ChromeDeclarativeNetRequestClient } from './Features/NetworkRules/ChromeDeclarativeNetRequestClient';
import { ChromeDnrFeedbackClient } from './Features/NetworkRules/ChromeDnrFeedbackClient';
import { ChromeTimeWindowScheduler } from './Features/NetworkRules/ChromeTimeWindowScheduler';
import { DeclarativeRuleSync } from './Features/NetworkRules/DeclarativeRuleSync';
import { TIME_WINDOW_ALARM_NAME } from './Features/NetworkRules/TimeWindowAlarmName';
import { DefaultPanelConnectionHub } from './Features/PanelConnections/DefaultPanelConnectionHub';
import type { PanelConnection } from './Features/PanelConnections/PanelConnection';
import { DefaultPostMessageProbeInstaller } from './Features/PostMessages/DefaultPostMessageProbeInstaller';
import { DefaultPostMessageSender } from './Features/PostMessages/DefaultPostMessageSender';
import { PostMessageBindingHandler } from './Features/PostMessages/PostMessageBindingHandler';
import { PostMessageSessionStep } from './Features/PostMessages/PostMessageSessionStep';
import { DefaultActiveRules } from './Features/Rules/DefaultActiveRules';
import { DefaultRuleHitCounter } from './Features/Rules/DefaultRuleHitCounter';
import { DefaultVariableStore } from './Features/Rules/DefaultVariableStore';
import { ChildSessionAttachedHandler } from './Features/Sessions/ChildSessionAttachedHandler';
import { ChildSessionDetachedHandler } from './Features/Sessions/ChildSessionDetachedHandler';
import { DefaultSessionPreparer } from './Features/Sessions/DefaultSessionPreparer';
import { FrameAutoAttachSessionStep } from './Features/Sessions/FrameAutoAttachSessionStep';
import { InterceptionSessionStep } from './Features/Sessions/InterceptionSessionStep';
import { NetworkSessionStep } from './Features/Sessions/NetworkSessionStep';
import { DefaultSettingsCache } from './Features/Settings/DefaultSettingsCache';
import { ChromeSidePanelClient } from './Features/SidePanel/ChromeSidePanelClient';

const logger = new ConsoleLogger();
const settingsCache = new DefaultSettingsCache(
    /* storageClient: */ new ChromeSettingsStorageClient(),
    /* logger: */ logger,
);
const variableStore = new DefaultVariableStore(logger);
const activeRules = new DefaultActiveRules(settingsCache, variableStore);
const hitCounter = new DefaultRuleHitCounter({
    feedback: new ChromeDnrFeedbackClient(),
    hitsClient: new ChromeRuleHitsClient(),
    logger,
});
const debuggerSessions = new DefaultDebuggerSessions();
const frameRegistry = new DefaultFrameRegistry();
const debuggerClient = new ChromeDebuggerClient(debuggerSessions);
const interceptionStep = new InterceptionSessionStep(debuggerClient, activeRules);
const liveListeningRegistry = new DefaultLiveListeningRegistry();
const postMessageInstaller = new DefaultPostMessageProbeInstaller(debuggerClient);
const sessionPreparer = new DefaultSessionPreparer(
    /* steps: */ [
        new NetworkSessionStep(debuggerClient),
        interceptionStep,
        new FrameAutoAttachSessionStep(debuggerClient),
        new PostMessageSessionStep(postMessageInstaller, liveListeningRegistry),
    ],
    /* logger: */ logger,
);
const connectionHub = new DefaultPanelConnectionHub(logger);
const timelineStore = new DefaultTimelineStore();
const liveStore = new DefaultLiveStore();
const eventStreamParsers = new DefaultEventStreamParsers();
const now = (): Date => new Date();
const contentKindClassifier = new DefaultContentKindClassifier();
const recordClassifier = new DefaultTimelineRecordClassifier(contentKindClassifier);
const browserRuleSimulator = new DefaultBrowserRuleSimulator(activeRules);
const clientRequestSender = new DefaultClientRequestSender(
    /* client: */ new ChromePanelTargetClient(),
    /* logger: */ logger,
);
const postMessageSender = new DefaultPostMessageSender(debuggerClient, () => Date.now());

const liveListening = new DefaultLiveListeningService({
    registry: liveListeningRegistry,
    installer: postMessageInstaller,
    sessions: debuggerSessions,
    isAttached: tabId => inspectionService.statusOf(tabId).state === INSPECTION_STATE.Attached,
    logger,
});

const inspectionService = new DefaultInspectionService({
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
    netRequestClient: new ChromeDeclarativeNetRequestClient(new ChromeRegexSupportClient()),
    reportClient: new ChromeRuleSyncReportClient(),
    hitCounter,
    timeWindowScheduler: new ChromeTimeWindowScheduler(logger),
    logger,
});

const captureFilter = new DefaultCaptureFilter();
const admission = new DefaultTimelineAdmission(timelineStore, browserRuleSimulator);

const cdpEventDispatcher = new CdpEventDispatcher(debuggerSessions)
    .register(new RequestWillBeSentHandler({
        timelineStore,
        admission,
        captureFilter,
        recordFactory: new DefaultTimelineRecordFactory(recordClassifier, frameRegistry),
        recordClassifier,
        browserRuleSimulator,
        debuggerClient,
        logger,
    }))
    .register(new RequestExtraInfoHandler(timelineStore))
    .register(new ResponseReceivedHandler({
        timelineStore,
        recordClassifier,
        browserRuleSimulator,
    }))
    .register(new ResponseExtraInfoHandler(timelineStore))
    .register(new LoadingFinishedHandler(
        /* timelineStore: */ timelineStore,
        /* bodyReader: */ new DefaultResponseBodyReader(debuggerClient),
    ))
    .register(new LoadingFailedHandler(timelineStore))
    .register(new RequestPausedHandler({
        activeRules,
        debuggerClient,
        timelineStore,
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
    .register(new ListeningGate({
        inner: new WebSocketCreatedHandler(liveStore, now),
        registry: liveListeningRegistry,
        kind: 'webSockets',
    }))
    .register(new ListeningGate({
        inner: new WebSocketFrameSentHandler(liveStore, now),
        registry: liveListeningRegistry,
        kind: 'webSockets',
    }))
    .register(new ListeningGate({
        inner: new WebSocketFrameReceivedHandler(liveStore, now),
        registry: liveListeningRegistry,
        kind: 'webSockets',
    }))
    .register(new WebSocketClosedHandler(liveStore))
    .register(new ListeningGate({
        inner: new EventSourceRequestHandler(liveStore, now),
        registry: liveListeningRegistry,
        kind: 'eventStreams',
    }))
    .register(new ListeningGate({
        inner: new EventSourceMessageHandler(liveStore, now),
        registry: liveListeningRegistry,
        kind: 'eventStreams',
    }))
    .register(new ListeningGate({
        inner: new FetchStreamResponseHandler({
            liveStore,
            parsers: eventStreamParsers,
            timelineStore,
            connectionHub,
            debuggerClient,
            logger,
            now,
        }),
        registry: liveListeningRegistry,
        kind: 'eventStreams',
    }))
    .register(new FetchStreamDataHandler({ liveStore, parsers: eventStreamParsers, now }))
    .register(new EventStreamEndedHandler({
        event: 'Network.loadingFinished',
        liveStore,
        parsers: eventStreamParsers,
    }))
    .register(new EventStreamEndedHandler({
        event: 'Network.loadingFailed',
        liveStore,
        parsers: eventStreamParsers,
    }))
    .register(new ListeningGate({
        inner: new PostMessageBindingHandler({ liveStore, sender: postMessageSender, now }),
        registry: liveListeningRegistry,
        kind: 'postMessages',
    }));

const endpointRouter = new PanelEndpointRouter()
    .register(new InspectTabEndpoint({ inspectionService, timelineStore, liveStore }))
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
    BackgroundTask.run({
        logger,
        description: 'Network rule sync',
        task: () => ruleSync.syncAsync(),
    });
    BackgroundTask.run({
        logger,
        description: 'Interception refresh',
        task: () => inspectionService.refreshInterceptionAsync(),
    });
});

const settingsReady = (async () => {
    await hitCounter.initializeAsync();
    await settingsCache.initializeAsync();
    await variableStore.initializeAsync();
    activeRules.refresh();
})();

async function syncNetworkRulesAsync(): Promise<void> {
    await settingsReady;
    await ruleSync.syncAsync();
}

async function handlePanelMessageAsync(connection: PanelConnection, message: unknown): Promise<void> {
    if (!endpointRouter.isPanelRequest(message)) {
        logger.warn('Ignored a malformed panel message.', message);

        return;
    }

    await settingsReady;
    const result = await endpointRouter.routeAsync(
        /* request: */ message,
        /* context: */ {
            connection,
        },
    );
    connectionHub.send(
        /* connection: */ connection,
        /* event: */ {
            type: WORKER_EVENT_TYPE.CommandCompleted,
            correlationId: message.correlationId,
            result,
        },
    );
}

liveStore.subscribe((tabId, event) => connectionHub.publishToTab(tabId, event));

timelineStore.subscribe(entry => connectionHub.publishToTab(
    /* tabId: */ entry.tabId,
    /* event: */ {
        type: WORKER_EVENT_TYPE.EntryUpserted,
        entry,
    },
));

settingsCache.watch(
    /* selector: */ settings => ({
        interceptionEnabled: settings.interceptionEnabled,
        rules: ActiveProfile.rules(settings),
        variables: ActiveProfile.variables(settings),
    }),
    /* onChange: */ () => activeRules.refresh(),
);

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== TIME_WINDOW_ALARM_NAME) {
        return;
    }

    BackgroundTask.run({
        logger,
        description: 'Time window refresh',
        task: async () => {
            await settingsReady;
            activeRules.refresh();
        },
    });
});

chrome.runtime.onInstalled.addListener(() => BackgroundTask.run({
    logger,
    description: 'Network rule sync',
    task: syncNetworkRulesAsync,
}));
chrome.runtime.onStartup.addListener(() => BackgroundTask.run({
    logger,
    description: 'Network rule sync',
    task: syncNetworkRulesAsync,
}));

chrome.debugger.onEvent.addListener((
    source,
    method,
    params,
) => {
    if (source.targetId != null) {
        clientRequestSender.handleEvent(
            /* targetId: */ source.targetId,
            /* method: */ method,
            /* params: */ params,
        );

        return;
    }

    BackgroundTask.run({
        logger,
        description: method,
        task: async () => {
            await settingsReady;
            await cdpEventDispatcher.dispatchAsync(
                /* source: */ source,
                /* method: */ method,
                /* params: */ params,
            );
        },
    });
});

chrome.debugger.onDetach.addListener((source, reason) => {
    if (source.targetId != null) {
        clientRequestSender.handleDetach(source.targetId);

        return;
    }

    if (source.tabId == null) {
        return;
    }

    inspectionService.handleDetach(source.tabId, reason);
});

chrome.tabs.onRemoved.addListener(tabId => inspectionService.forget(tabId));

chrome.runtime.onConnect.addListener(port => {
    if (port.name !== PANEL_PORT_NAME) {
        return;
    }

    const connection = connectionHub.add(port);
    hitCounter.startPolling();
    port.onMessage.addListener(message => BackgroundTask.run({
        logger,
        description: 'Panel command',
        task: () => handlePanelMessageAsync(connection, message),
    }));
    port.onDisconnect.addListener(() => {
        connectionHub.remove(connection.id);
        if (!connectionHub.hasConnections()) {
            hitCounter.stopPolling();
        }

        BackgroundTask.run({
            logger,
            description: 'Panel release',
            task: () => inspectionService.releaseAsync(connection.tabId),
        });
    });
});

BackgroundTask.run({
    logger,
    description: 'Side panel setup',
    task: async () => {
        const configured = await new ChromeSidePanelClient().openOnToolbarClickAsync();
        if (configured.hasErrors) {
            logger.error(configured.error);
        }
    },
});
