import { describe, expect, test, vi } from 'vitest';
import { Equalities } from './Equalities';
import { Store } from './Store';

interface CounterState {
    count: number;
    label: string;
}

describe('Store', () => {
    test('select_WhenOtherFieldsChange_ShouldNotifyOnlyWhenTheSliceChanges', () => {
        // Arrange
        const store = new Store<CounterState>({
            count: 0,
            label: 'a',
        });
        const listener = vi.fn();
        store.select({
            selector: state => state.count,
            listener,
        });

        // Act
        store.update(state => ({
            ...state,
            label: 'b',
        }));
        store.update(state => ({
            ...state,
            count: 1,
        }));

        // Assert
        expect(listener.mock.calls).toEqual([
            [0],
            [1],
        ]);
    });

    test('select_WhenTheSelectorBuildsNewArrays_ShouldUseTheEquality', () => {
        // Arrange
        const store = new Store<CounterState>({
            count: 0,
            label: 'a',
        });
        const listener = vi.fn();
        store.select({
            selector: state => [state.count],
            listener,
            isEqual: Equalities.shallowArray,
        });

        // Act
        store.update(state => ({
            ...state,
            label: 'b',
        }));

        // Assert
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('update_WhenTheChangeReturnsTheSameState_ShouldSkipListeners', () => {
        // Arrange
        const store = new Store<CounterState>({
            count: 0,
            label: 'a',
        });
        const listener = vi.fn();
        store.select({
            selector: state => state,
            listener,
        });

        // Act
        store.update(state => state);

        // Assert
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('select_WhenUnsubscribed_ShouldStopNotifying', () => {
        // Arrange
        const store = new Store<CounterState>({
            count: 0,
            label: 'a',
        });
        const listener = vi.fn();
        const unsubscribe = store.select({
            selector: state => state.count,
            listener,
        });
        unsubscribe();

        // Act
        store.update(state => ({
            ...state,
            count: 1,
        }));

        // Assert
        expect(listener.mock.calls).toEqual([[0]]);
    });
});
