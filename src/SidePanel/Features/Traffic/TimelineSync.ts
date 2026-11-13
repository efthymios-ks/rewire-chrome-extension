import { InspectionState } from "../../../Contracts/Inspection/InspectionState";
import type { InspectionStatus } from "../../../Contracts/Inspection/InspectionStatus";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import { WorkerEventType } from "../../../Contracts/Messaging/WorkerEventType";
import type { InspectedTab } from "../../Core/InspectedTab";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";
import type { IWorkerConnection } from "../../Core/WorkerConnection";
import { LiveEntries } from "../Live/LiveEntries";
import { ListeningToggle } from "../Live/ListeningToggle";
import { TimelineEntries } from "./TimelineEntries";
import { WorkerEventRouter } from "./WorkerEventRouter";

function withoutSelection(state: PanelState): PanelState {
    return {
        ...state,
        selectedEntryId: null,
        selectedEntryDetail: null,
        detailError: null,
    };
}

export class TimelineSync {
    private readonly _store: Store<PanelState>;
    private readonly _connection: IWorkerConnection;
    private readonly _eventRouter: WorkerEventRouter;

    constructor(store: Store<PanelState>, connection: IWorkerConnection) {
        this._store = store;
        this._connection = connection;
        this._eventRouter = new WorkerEventRouter()
            .on(WorkerEventType.EntryUpserted, event => this.whenInspecting(
                event.entry.tabId,
                state => ({
                    ...state,
                    entries: TimelineEntries.upsert(state.entries, event.entry),
                })
            ))
            .on(WorkerEventType.TimelineCleared, event => this.whenInspecting(
                event.tabId,
                state => ({
                    ...withoutSelection(state),
                    entries: [],
                })
            ))
            .on(WorkerEventType.InspectionChanged, event => this.whenInspecting(
                event.tabId,
                state => ({
                    ...state,
                    inspection: event.status,
                })
            ))
            .on(WorkerEventType.EntryRemoved, event => this.whenInspecting(
                event.tabId,
                state => ({
                    ...state,
                    entries: state.entries.filter(entry => entry.id !== event.entryId),
                })
            ))
            .on(WorkerEventType.ChannelUpserted, event => this.whenInspecting(
                event.channel.tabId,
                state => ({
                    ...state,
                    live: LiveEntries.upsertChannel(state.live, event.channel),
                })
            ))
            .on(WorkerEventType.LiveMessageAdded, event => this.whenInspecting(
                event.tabId,
                state => ({
                    ...state,
                    live: LiveEntries.addMessage(state.live, event.message),
                })
            ))
            .on(WorkerEventType.PostMessageAdded, event => this.whenInspecting(
                event.record.tabId,
                state => ({
                    ...state,
                    live: LiveEntries.addPostMessage(state.live, event.record),
                })
            ));
    }

    start(): void {
        this._connection.onEvent(event => this._eventRouter.route(event));
        this._connection.onReconnect(() => void this.reinspect());
    }

    async inspect(tab: InspectedTab | null): Promise<void> {
        this._store.update(state => ({
            ...withoutSelection(state),
            inspectedTab: tab,
            entries: [],
            live: LiveEntries.withoutPage(state.live),
            inspection: {
                state: tab === null ? InspectionState.Idle : InspectionState.Attaching,
                message: "",
            },
        }));

        if (tab === null) {
            return;
        }

        await this.requestInspection(tab.tabId);
    }

    updateTab(tab: InspectedTab): void {
        const state = this._store.getState();
        const shouldRetry = state.inspectedTab?.tabId === tab.tabId
            && state.inspectedTab.url !== tab.url
            && state.inspection.state === InspectionState.Failed;
        this.whenInspecting(
            tab.tabId,
            current => ({
                ...current,
                inspectedTab: tab,
            })
        );

        if (shouldRetry) {
            void this.requestInspection(tab.tabId);
        }
    }

    async reinspect(): Promise<void> {
        const tab = this._store.getState().inspectedTab;
        if (tab === null) {
            return;
        }

        await this.requestInspection(tab.tabId);
    }

    async clear(): Promise<void> {
        const tab = this._store.getState().inspectedTab;
        if (tab === null) {
            return;
        }

        await this._connection.send<PanelCommandType.ClearTimeline>({
            type: PanelCommandType.ClearTimeline,
            tabId: tab.tabId,
        });
    }

    private async requestInspection(tabId: number): Promise<void> {
        const result = await this._connection.send<PanelCommandType.InspectTab>({
            type: PanelCommandType.InspectTab,
            tabId,
        });
        if (result.hasErrors) {
            const failure: InspectionStatus = {
                state: InspectionState.Failed,
                message: result.error,
            };
            this.whenInspecting(
                tabId,
                state => ({
                    ...state,
                    inspection: failure,
                })
            );

            return;
        }

        this.whenInspecting(
            tabId,
            state => ({
                ...state,
                inspection: result.value.status,
                entries: result.value.entries,
                live: LiveEntries.withPage(state.live, result.value.live),
            })
        );

        const isListening = Object
            .values(this._store.getState().liveListening)
            .some(Boolean);
        if (isListening) {
            await ListeningToggle.send(this._store, this._connection);
        }
    }

    private whenInspecting(tabId: number, change: (state: PanelState) => PanelState): void {
        this._store.update(state => state.inspectedTab?.tabId === tabId ? change(state) : state);
    }
}
