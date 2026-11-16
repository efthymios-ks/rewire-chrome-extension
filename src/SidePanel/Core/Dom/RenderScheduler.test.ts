import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RenderScheduler } from './RenderScheduler';

const FRAME_INTERVAL_IN_MILLISECONDS = 16;

describe('RenderScheduler', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('schedule_WhenCalled_ShouldRenderOnTheNextFrame', () => {
        // Arrange
        const render = vi.fn();
        const scheduler = new RenderScheduler(render);

        // Act
        scheduler.schedule();
        vi.advanceTimersByTime(FRAME_INTERVAL_IN_MILLISECONDS - 1);
        const callsBefore = render.mock.calls.length;
        vi.advanceTimersByTime(1);

        // Assert
        expect(callsBefore).toBe(0);
        expect(render).toHaveBeenCalledOnce();
    });

    test('schedule_WhenCalledManyTimesInOneFrame_ShouldRenderOnce', () => {
        // Arrange
        const render = vi.fn();
        const scheduler = new RenderScheduler(render);

        // Act
        scheduler.schedule();
        scheduler.schedule();
        scheduler.schedule();
        vi.runAllTimers();

        // Assert
        expect(render).toHaveBeenCalledOnce();
    });

    test('schedule_WhenCalledAfterARender_ShouldRenderAgain', () => {
        // Arrange
        const render = vi.fn();
        const scheduler = new RenderScheduler(render);
        scheduler.schedule();
        vi.runAllTimers();

        // Act
        scheduler.schedule();
        vi.runAllTimers();

        // Assert
        expect(render).toHaveBeenCalledTimes(2);
    });
});
