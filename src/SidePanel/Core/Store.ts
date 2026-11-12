type StateListener<TState> = (state: TState) => void;

export type Equality<TValue> = (left: TValue, right: TValue) => boolean;

export class Store<TState> {
    private _state: TState;
    private readonly _listeners = new Set<StateListener<TState>>();

    constructor(initialState: TState) {
        this._state = initialState;
    }

    getState(): TState {
        return this._state;
    }

    update(change: (state: TState) => TState): void {
        const next = change(this._state);
        if (next === this._state) {
            return;
        }

        this._state = next;
        this._listeners.forEach(listener => listener(next));
    }

    select<TSlice>(
        selector: (state: TState) => TSlice,
        listener: (slice: TSlice) => void,
        isEqual: Equality<TSlice> = Object.is
    ): () => void {
        let current = selector(this._state);
        listener(current);

        const stateListener: StateListener<TState> = state => {
            const next = selector(state);
            if (isEqual(current, next)) {
                return;
            }

            current = next;
            listener(next);
        };
        this._listeners.add(stateListener);

        return () => {
            this._listeners.delete(stateListener);
        };
    }
}
