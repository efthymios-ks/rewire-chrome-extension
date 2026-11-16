import { INSPECTION_STATE } from '../../../Contracts/Inspection/InspectionState';
import type { InspectionStatus } from '../../../Contracts/Inspection/InspectionStatus';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import type { InspectedTab } from '../../Core/InspectedTab';
import type { Notifier } from '../../Core/Notifier';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import { LiveEntries } from '../Live/LiveEntries';
import { ListeningToggle } from '../Live/ListeningToggle';
import { TimelineEntries } from './TimelineEntries';
import { WorkerEventRouter } from './WorkerEventRouter';

function withoutSelection(state: PanelState): PanelState {
    return {
        ...state,
        selectedEntryId: null,
        selectedEntryDetail: null,
        detailError: null,
    };
}

export interface TimelineSyncDependencies {
    store: Store<PanelState>;
    connection: WorkerConnection;
    notifier: Notifier;
}

export class TimelineSync {
    private readonly _store: Store<PanelState>;
    private readonly _connection: WorkerConnection;
    private readonly _notifier: Notifier;
    private readonly _eventRouter: WorkerEventRouter;

    constructor({ store, connection, notifier }: TimelineSyncDependencies) {
        this._store = store;
        this._connection = connection;
        this._notifier = notifier;
        this._eventRouter = new WorkerEventRouter()
            .on(WORKER_EVENT_TYPE.EntryUpserted, event => this.whenInspecting(
                /* tabId: */ event.entry.tabId,
                /* change: */ state => ({
                    ...state,
                    entries: TimelineEntries.upsert(state.entries, event.entry),
                }),
            ))
            .on(WORKER_EVENT_TYPE.TimelineCleared, event => this.whenInspecting(
                /* tabId: */ event.tabId,
                /* change: */ state => ({
                    ...withoutSelection(state),
                    entries: [],
                }),
            ))
            .on(WORKER_EVENT_TYPE.InspectionChanged, event => this.whenInspecting(
                /* tabId: */ event.tabId,
                /* change: */ state => ({
                    ...state,
                    inspection: event.status,
                }),
            ))
            .on(WORKER_EVENT_TYPE.EntryRemoved, event => this.whenInspecting(
                /* tabId: */ event.tabId,
                /* change: */ state => ({
                    ...state,
                    entries: state.entries.filter(entry => entry.id !== event.entryId),
                }),
            ))
            .on(WORKER_EVENT_TYPE.ChannelUpserted, event => this.whenInspecting(
                /* tabId: */ event.channel.tabId,
                /* change: */ state => ({
                    ...state,
                    live: LiveEntries.upsertChannel(state.live, event.channel),
                }),
            ))
            .on(WORKER_EVENT_TYPE.LiveMessageAdded, event => this.whenInspecting(
                /* tabId: */ event.tabId,
                /* change: */ state => ({
                    ...state,
                    live: LiveEntries.addMessage(state.live, event.message),
                }),
            ))
            .on(WORKER_EVENT_TYPE.PostMessageAdded, event => this.whenInspecting(
                /* tabId: */ event.record.tabId,
                /* change: */ state => ({
                    ...state,
                    live: LiveEntries.addPostMessage(state.live, event.record),
                }),
            ));
    }

    start(): void {
        this._connection.onEvent(event => this._eventRouter.route(event));
        this._connection.onReconnect(() => void this.reinspectAsync());
    }

    async inspectAsync(tab: InspectedTab | null): Promise<void> {
        this._store.update(state => ({
            ...withoutSelection(state),
            inspectedTab: tab,
            entries: [],
            live: LiveEntries.withoutPage(state.live),
            inspection: {
                state: tab == null ? INSPECTION_STATE.Idle : INSPECTION_STATE.Attaching,
                message: '',
            },
        }));

        if (tab == null) {
            return;
        }

        await this.requestInspectionAsync(tab.tabId);
    }

    updateTab(tab: InspectedTab): void {
        const state = this._store.getState();
        const shouldRetry = state.inspectedTab?.tabId === tab.tabId
            && state.inspectedTab.url !== tab.url
            && state.inspection.state === INSPECTION_STATE.Failed;
        this.whenInspecting(
            /* tabId: */ tab.tabId,
            /* change: */ current => ({
                ...current,
                inspectedTab: tab,
            }),
        );

        if (shouldRetry) {
            void this.requestInspectionAsync(tab.tabId);
        }
    }

    async reinspectAsync(): Promise<void> {
        const tab = this._store.getState().inspectedTab;
        if (tab == null) {
            return;
        }

        await this.requestInspectionAsync(tab.tabId);
    }

    async clearAsync(): Promise<void> {
        const tab = this._store.getState().inspectedTab;
        if (tab == null) {
            return;
        }

        const cleared = await this._connection.sendAsync<typeof PANEL_COMMAND_TYPE.ClearTimeline>({
            type: PANEL_COMMAND_TYPE.ClearTimeline,
            tabId: tab.tabId,
        });
        if (cleared.hasErrors) {
            this._notifier.show(cleared.error);
        }
    }

    private async requestInspectionAsync(tabId: number): Promise<void> {
        const result = await this._connection.sendAsync<typeof PANEL_COMMAND_TYPE.InspectTab>({
            type: PANEL_COMMAND_TYPE.InspectTab,
            tabId,
        });
        if (result.hasErrors) {
            const failure: InspectionStatus = {
                state: INSPECTION_STATE.Failed,
                message: result.error,
            };
            this.whenInspecting(
                /* tabId: */ tabId,
                /* change: */ state => ({
                    ...state,
                    inspection: failure,
                }),
            );

            return;
        }

        this.whenInspecting(
            /* tabId: */ tabId,
            /* change: */ state => ({
                ...state,
                inspection: result.value.status,
                entries: result.value.entries,
                live: LiveEntries.withPage(state.live, result.value.live),
            }),
        );

        const isListening = Object
            .values(this._store.getState().liveListening)
            .some(Boolean);
        if (!isListening) {
            return;
        }

        const listening = await ListeningToggle.sendAsync(this._store, this._connection);
        if (listening.hasErrors) {
            this._notifier.show(listening.error);
        }
    }

    private whenInspecting(tabId: number, change: (state: PanelState) => PanelState): void {
        this._store.update(state => state.inspectedTab?.tabId === tabId ? change(state) : state);
    }
}
