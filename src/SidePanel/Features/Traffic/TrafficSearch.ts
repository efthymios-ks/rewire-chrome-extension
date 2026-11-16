import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { SearchQuery } from '../../../Contracts/Search/SearchQuery';
import { PANEL_LIMITS } from '../../Core/PanelLimits';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import type { WorkerConnection } from '../../Core/WorkerConnection';

export interface ApplyOptions {
    version: number;
    searchedText: string;
    matches: PanelState['search']['matches'];
    error: string | null;
}

export class TrafficSearch {
    private readonly _store: Store<PanelState>;
    private readonly _connection: WorkerConnection;
    private _timer: ReturnType<typeof setTimeout> | null = null;
    private _version = 0;

    constructor(store: Store<PanelState>, connection: WorkerConnection) {
        this._store = store;
        this._connection = connection;
    }

    start(): void {
        this._store.select({
            selector: state => state.entries,
            listener: () => this.refresh(),
        });
    }

    setQuery(query: SearchQuery): void {
        this._store.update(state => ({
            ...state,
            search: {
                ...state.search,
                query,
            },
        }));
        this.restart();
    }

    // Typing restarts the wait, so only the last query is searched.
    private restart(): void {
        if (this._timer != null) {
            clearTimeout(this._timer);
            this._timer = null;
        }

        this.wait();
    }

    // Traffic joins a pending wait instead of restarting it, so a steady stream is still searched.
    private refresh(): void {
        if (this._timer != null || this._store.getState().search.query.text === '') {
            return;
        }

        this.wait();
    }

    private wait(): void {
        this._timer = setTimeout(
            /* callback: */ () => {
                this._timer = null;
                void this.runAsync();
            },
            /* delay: */ PANEL_LIMITS.SearchDebounceInMilliseconds,
        );
    }

    private async runAsync(): Promise<void> {
        const state = this._store.getState();
        const query = state.search.query;
        const tabId = state.inspectedTab?.tabId;
        const version = ++this._version;
        if (query.text === '' || tabId == null) {
            this.apply({
                version,
                searchedText: query.text,
                matches: [],
                error: null,
            });

            return;
        }

        const result = await this._connection.sendAsync<typeof PANEL_COMMAND_TYPE.SearchTimeline>({
            type: PANEL_COMMAND_TYPE.SearchTimeline,
            tabId,
            query,
        });
        if (result.hasErrors) {
            this.apply({
                version,
                searchedText: query.text,
                matches: [],
                error: result.error,
            });

            return;
        }

        this.apply({
            version,
            searchedText: query.text,
            matches: result.value.toReversed(),
            error: null,
        });
    }

    private apply({ version, searchedText, matches, error }: ApplyOptions): void {
        if (version !== this._version) {
            return;
        }

        this._store.update(state => ({
            ...state,
            search: {
                ...state.search,
                searchedText,
                matches,
                error,
            },
        }));
    }
}
