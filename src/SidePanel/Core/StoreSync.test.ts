import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../Common/Results/Result';
import type { PanelState } from './PanelState';
import { PanelStateFactory } from './PanelStateFactory';
import { Store } from './Store';
import { StoreSync } from './StoreSync';

function setUp(loaded: Result<string>) {
    const store = new Store<PanelState>(PanelStateFactory.initial());
    let push: (value: string) => void = () => {};
    const logFailure = vi.fn();
    const sync = new StoreSync<string>({
        store,
        source: {
            loadAsync: vi.fn().mockResolvedValue(loaded),
            subscribe: listener => {
                push = listener;
            },
        },
        logFailure,
        applyTo: (state, frameFilter) => ({
            ...state,
            frameFilter,
        }),
    });

    return {
        store,
        logFailure,
        sync,
        push: (value: string) => push(value),
    };
}

describe('StoreSync', () => {
    test('startAsync_WhenTheSourceLoads_ShouldApplyTheValueToTheState', async () => {
        // Arrange
        const { store, sync } = setUp(Result.ok('checkout.example.com'));

        // Act
        await sync.startAsync();

        // Assert
        expect(store.getState().frameFilter).toBe('checkout.example.com');
    });

    test('startAsync_WhenLoadingFails_ShouldLogTheErrorAndKeepTheState', async () => {
        // Arrange
        const { store, logFailure, sync } = setUp(Result.fail('Storage is unavailable.'));
        const before = store.getState();

        // Act
        await sync.startAsync();

        // Assert
        expect(logFailure).toHaveBeenCalledWith('Storage is unavailable.');
        expect(store.getState()).toBe(before);
    });

    test('startAsync_WhenTheSourceChangesLater_ShouldFollowIt', async () => {
        // Arrange
        const { store, sync, push } = setUp(Result.ok('checkout.example.com'));
        await sync.startAsync();

        // Act
        push('ads.example.com');

        // Assert
        expect(store.getState().frameFilter).toBe('ads.example.com');
    });
});
