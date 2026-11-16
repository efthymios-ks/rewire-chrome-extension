import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { PANEL_LIMITS } from '../../Core/PanelLimits';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import { TimelineEntries } from '../Traffic/TimelineEntries';

export class EntryDetailLoader {
    private readonly _store: Store<PanelState>;
    private readonly _connection: WorkerConnection;
    private _loadTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(store: Store<PanelState>, connection: WorkerConnection) {
        this._store = store;
        this._connection = connection;
    }

    start(): void {
        this._store.select({
            selector: state => TimelineEntries.selectedOf(state),
            listener: summary => this.schedule(summary),
        });
    }

    private schedule(summary: TimelineEntrySummary | null): void {
        if (this._loadTimer != null) {
            clearTimeout(this._loadTimer);
        }

        if (summary == null) {
            return;
        }

        this._loadTimer = setTimeout(
            /* callback: */ () => void this.loadAsync(summary),
            /* delay: */ PANEL_LIMITS.DetailLoadDelayInMilliseconds,
        );
    }

    private async loadAsync(summary: TimelineEntrySummary): Promise<void> {
        const result = await this._connection.sendAsync<typeof PANEL_COMMAND_TYPE.GetEntryDetail>({
            type: PANEL_COMMAND_TYPE.GetEntryDetail,
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
