import { afterEach, describe, expect, test, vi } from 'vitest';
import { ConsoleLogger } from './ConsoleLogger';

describe('ConsoleLogger', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('warn_WhenContextIsGiven_ShouldPrefixTheMessageAndPassTheContext', () => {
        // Arrange
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const context = {
            ruleId: 'rule-1',
        };

        // Act
        new ConsoleLogger().warn('Rule skipped.', context);

        // Assert
        expect(warn).toHaveBeenCalledWith('[Rewire] Rule skipped.', context);
    });

    test('warn_WhenContextIsMissing_ShouldPassAnEmptyText', () => {
        // Arrange
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Act
        new ConsoleLogger().warn('Rule skipped.');

        // Assert
        expect(warn).toHaveBeenCalledWith('[Rewire] Rule skipped.', '');
    });

    test('error_WhenContextIsGiven_ShouldPrefixTheMessageAndPassTheContext', () => {
        // Arrange
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const failure = new Error('boom');

        // Act
        new ConsoleLogger().error('Saving failed.', failure);

        // Assert
        expect(error).toHaveBeenCalledWith('[Rewire] Saving failed.', failure);
    });

    test('error_WhenContextIsNull_ShouldPassAnEmptyText', () => {
        // Arrange
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        new ConsoleLogger().error('Saving failed.', null);

        // Assert
        expect(error).toHaveBeenCalledWith('[Rewire] Saving failed.', '');
    });

    test('error_WhenContextIsFalsyButPresent_ShouldPassItThrough', () => {
        // Arrange
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        new ConsoleLogger().error('Count was', 0);

        // Assert
        expect(error).toHaveBeenCalledWith('[Rewire] Count was', 0);
    });
});
