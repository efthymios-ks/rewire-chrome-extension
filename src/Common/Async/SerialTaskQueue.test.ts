import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { delayAsync } from './delayAsync';
import { SerialTaskQueue } from './SerialTaskQueue';

describe('SerialTaskQueue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('enqueueAsync_WhenTasksTakeDifferentTimes_ShouldRunThemInOrderOneAtATime', async () => {
        // Arrange
        const queue = new SerialTaskQueue();
        const events: string[] = [];
        const slow = queue.enqueueAsync(async () => {
            events.push('slow:start');
            await delayAsync(500);
            events.push('slow:end');
        });
        const fast = queue.enqueueAsync(async () => {
            events.push('fast:start');
            await delayAsync(10);
            events.push('fast:end');
        });

        // Act
        await vi.advanceTimersByTimeAsync(510);
        await Promise.all([
            slow,
            fast,
        ]);

        // Assert
        expect(events).toEqual([
            'slow:start',
            'slow:end',
            'fast:start',
            'fast:end',
        ]);
    });

    test('enqueueAsync_WhenEarlierTaskIsRunning_ShouldNotStartTheNextOne', async () => {
        // Arrange
        const queue = new SerialTaskQueue();
        const second = vi.fn(async () => {});
        void queue.enqueueAsync(() => delayAsync(1_000));
        void queue.enqueueAsync(second);

        // Act
        await vi.advanceTimersByTimeAsync(999);

        // Assert
        expect(second).not.toHaveBeenCalled();
    });

    test('enqueueAsync_WhenATaskFails_ShouldRejectItsOwnPromiseAndKeepGoing', async () => {
        // Arrange
        const queue = new SerialTaskQueue();
        const after = vi.fn(async () => {});

        // Act
        const failed = queue.enqueueAsync(async () => {
            throw new Error('boom');
        });
        const next = queue.enqueueAsync(after);

        // Assert
        await expect(failed).rejects.toThrow('boom');
        await expect(next).resolves.toBeUndefined();
        expect(after).toHaveBeenCalledOnce();
    });

    test('enqueueAsync_WhenQueueIsIdle_ShouldRunTheTaskAndResolve', async () => {
        // Arrange
        const queue = new SerialTaskQueue();
        const task = vi.fn(async () => {});

        // Act
        await queue.enqueueAsync(task);

        // Assert
        expect(task).toHaveBeenCalledOnce();
    });
});
