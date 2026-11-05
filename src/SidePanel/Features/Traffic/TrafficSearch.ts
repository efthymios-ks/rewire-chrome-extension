import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { SearchQuery } from "../../../Contracts/Search/SearchQuery";
import { PanelLimits } from "../../Core/PanelLimits";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";
import type { IWorkerConnection } from "../../Core/WorkerConnection";
import { EntrySelection } from "./EntrySelection";

export class TrafficSearch {
    private readonly _store: Store<PanelState>;
    private readonly _connection: IWorkerConnection;
    private _timer: ReturnType<typeof setTimeout> | null = null;
    private _version = 0;

    constructor(store: Store<PanelState>, connection: IWorkerConnection) {
        this._store = store;
        this._connection = connection;
    }

    start(): void {
        this._store.select(
            state => state.entries.length,
            () => this.schedule()
        );
    }

    setQuery(query: SearchQuery): void {
        this._store.update(state => ({
            ...state,
            search: {
                ...state.search,
                query,
            },
        }));
        this.schedule();
    }

    step(offset: number): void {
        const search = this._store.getState().search;
        if (search.matches.length === 0) {
            return;
        }

        const activeIndex = (search.activeIndex + offset + search.matches.length) % search.matches.length;
        this._store.update(state => ({
            ...state,
            search: {
                ...state.search,
                activeIndex,
            },
        }));
        const match = search.matches[activeIndex];
        if (match !== undefined) {
            EntrySelection.select(this._store, match.entryId);
        }
    }

    private schedule(): void {
        if (this._timer !== null) {
            clearTimeout(this._timer);
        }

        this._timer = setTimeout(
            () => void this.run(),
            PanelLimits.SearchDebounceInMilliseconds
        );
    }

    private async run(): Promise<void> {
        const state = this._store.getState();
        const query = state.search.query;
        const tabId = state.inspectedTab?.tabId;
        const version = ++this._version;
        if (query.text === "" || tabId === undefined) {
            this.apply(
                version,
                [],
                null
            );

            return;
        }

        const result = await this._connection.send<PanelCommandType.SearchTimeline>({
            type: PanelCommandType.SearchTimeline,
            tabId,
            query,
        });
        if (result.hasErrors) {
            this.apply(
                version,
                [],
                result.error
            );

            return;
        }

        this.apply(
            version,
            result.value.toReversed(),
            null
        );
    }

    private apply(
        version: number,
        matches: PanelState["search"]["matches"],
        error: string | null
    ): void {
        if (version !== this._version) {
            return;
        }

        this._store.update(state => ({
            ...state,
            search: {
                ...state.search,
                matches,
                error,
                activeIndex: Math.min(state.search.activeIndex, matches.length - 1),
            },
        }));
    }
}
