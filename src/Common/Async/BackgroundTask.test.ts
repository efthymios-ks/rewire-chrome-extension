import { describe, expect, test, vi } from 'vitest';
import { BackgroundTask } from './BackgroundTask';
import { createLogger } from '../../TestData';

describe('BackgroundTask', () => {
    test('run_WhenTaskSucceeds_ShouldNotLog', async () => {
        // Arrange
        const logger = createLogger();
        const task = vi.fn(async () => 'done');

        // Act
        BackgroundTask.run({
            logger,
            description: 'Saving hits',
            task,
        });
        await vi.waitFor(() => expect(task).toHaveBeenCalledOnce());
        await Promise.resolve();

        // Assert
        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    test('run_WhenTaskRejects_ShouldLogTheDescriptionAndError', async () => {
        // Arrange
        const logger = createLogger();
        const error = new Error('quota exceeded');

        // Act
        BackgroundTask.run({
            logger,
            description: 'Saving hits',
            task: async () => {
                throw error;
            },
        });

        // Assert
        await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith('Saving hits failed.', error));
    });

    test('run_WhenCalled_ShouldStartTheTaskSynchronously', () => {
        // Arrange
        const task = vi.fn(async () => {});

        // Act
        BackgroundTask.run({
            logger: createLogger(),
            description: 'Sync',
            task,
        });

        // Assert
        expect(task).toHaveBeenCalledOnce();
    });
});
