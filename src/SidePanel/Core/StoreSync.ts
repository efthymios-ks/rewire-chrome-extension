import type { Result } from '../../Common/Results/Result';
import type { PanelState } from './PanelState';
import type { Store } from './Store';

export interface StoreSyncOptions<TValue> {
    store: Store<PanelState>;
    source: {
        loadAsync(): Promise<Result<TValue>>;
        subscribe(listener: (value: TValue) => void): void;
    };
    logFailure: (message: string) => void;
    applyTo: (state: PanelState, value: TValue) => PanelState;
}

export class StoreSync<TValue> {
    private readonly _options: StoreSyncOptions<TValue>;

    constructor(options: StoreSyncOptions<TValue>) {
        this._options = options;
    }

    async startAsync(): Promise<void> {
        const { source, logFailure } = this._options;
        source.subscribe(value => this.apply(value));

        const loaded = await source.loadAsync();
        if (loaded.hasErrors) {
            logFailure(loaded.error);

            return;
        }

        this.apply(loaded.value);
    }

    private apply(value: TValue): void {
        const { store, applyTo } = this._options;
        store.update(state => applyTo(state, value));
    }
}
