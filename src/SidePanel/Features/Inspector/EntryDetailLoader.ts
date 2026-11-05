import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import { PanelLimits } from "../../Core/PanelLimits";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";
import type { IWorkerConnection } from "../../Core/WorkerConnection";
import { TimelineEntries } from "../Traffic/TimelineEntries";

export class EntryDetailLoader {
    private readonly _store: Store<PanelState>;
    private readonly _connection: IWorkerConnection;
    private _loadTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(store: Store<PanelState>, connection: IWorkerConnection) {
        this._store = store;
        this._connection = connection;
    }

    start(): void {
        this._store.select(
            state => TimelineEntries.selectedOf(state),
            summary => this.schedule(summary)
        );
    }

    private schedule(summary: TimelineEntrySummary | null): void {
        if (this._loadTimer !== null) {
            clearTimeout(this._loadTimer);
        }

        if (summary === null) {
            return;
        }

        this._loadTimer = setTimeout(
            () => void this.load(summary),
            PanelLimits.DetailLoadDelayInMilliseconds
        );
    }

    private async load(summary: TimelineEntrySummary): Promise<void> {
        const result = await this._connection.send<PanelCommandType.GetEntryDetail>({
            type: PanelCommandType.GetEntryDetail,
            tabId: summary.tabId,
            entryId: summary.id,
        });

        this._store.update(state => {
            if (state.selectedEntryId !== summary.id) {
                return state;
            }

            if (result.hasErrors) {
                return {
                    ...state,
                    detailError: result.error,
                };
            }

            return {
                ...state,
                selectedEntryDetail: result.value,
                detailVersion: state.detailVersion + 1,
                detailError: null,
            };
        });
    }
}
