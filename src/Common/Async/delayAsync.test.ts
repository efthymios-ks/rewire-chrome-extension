import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { delayAsync } from './delayAsync';

describe('delayAsync', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('delayAsync_WhenTimeHasNotElapsed_ShouldStayPending', async () => {
        // Arrange
        const isDone = vi.fn();
        const observeAsync = async () => {
            await delayAsync(1_000);
            isDone();
        };
        void observeAsync();

        // Act
        await vi.advanceTimersByTimeAsync(999);

        // Assert
        expect(isDone).not.toHaveBeenCalled();
    });

    test('delayAsync_WhenTimeElapses_ShouldResolveWithNoValue', async () => {
        // Arrange
        const pending = delayAsync(1_000);

        // Act
        await vi.advanceTimersByTimeAsync(1_000);

        // Assert
        await expect(pending).resolves.toBeUndefined();
    });

    test('delayAsync_WhenDelayIsZero_ShouldResolveOnTheNextTimerTick', async () => {
        // Arrange
        const isDone = vi.fn();
        const observeAsync = async () => {
            await delayAsync(0);
            isDone();
        };
        void observeAsync();

        // Act
        await vi.advanceTimersByTimeAsync(0);

        // Assert
        expect(isDone).toHaveBeenCalledOnce();
    });
});
