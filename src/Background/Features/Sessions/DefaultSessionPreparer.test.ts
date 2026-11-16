import { describe, expect, test, vi } from 'vitest';
import { DefaultSessionPreparer } from './DefaultSessionPreparer';
import type { SessionStep } from './SessionStep';
import { Result } from '../../../Common/Results/Result';
import { createLogger } from '../../../TestData';

interface AStepOptions {
    name: string;
    isRequired: boolean;
    result: Result<void>;
}

function aStep({ name, isRequired, result }: AStepOptions): SessionStep {
    return {
        name,
        isRequired,
        applyAsync: vi.fn().mockResolvedValue(result),
    };
}

describe('DefaultSessionPreparer', () => {
    test('prepareAsync_WhenARequiredStepFails_ShouldStopAndReturnItsError', async () => {
        // Arrange
        const network = aStep({
            name: 'Network capture',
            isRequired: true,
            result: Result.fail('Network.enable failed: closed'),
        });
        const later = aStep({
            name: 'Later',
            isRequired: true,
            result: Result.done(),
        });
        const preparer = new DefaultSessionPreparer(
            /* steps: */ [
                network,
                later,
            ],
            /* logger: */ createLogger(),
        );

        // Act
        const result = await preparer.prepareAsync(1, 'session-a');

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Network.enable failed: closed',
        });
        expect(later.applyAsync).not.toHaveBeenCalled();
    });

    test('prepareAsync_WhenAnOptionalStepFails_ShouldWarnAndGoOn', async () => {
        // Arrange
        const logger = createLogger();
        const frames = aStep({
            name: 'Cross-origin iframes',
            isRequired: false,
            result: Result.fail('Target.setAutoAttach failed: not allowed'),
        });
        const later = aStep({
            name: 'Later',
            isRequired: true,
            result: Result.done(),
        });
        const preparer = new DefaultSessionPreparer(
            /* steps: */ [
                frames,
                later,
            ],
            /* logger: */ logger,
        );

        // Act
        const result = await preparer.prepareAsync(1, null);

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(later.applyAsync).toHaveBeenCalledWith(1, null);
        expect(logger.warn).toHaveBeenCalledWith(
            /* message: */ "Cross-origin iframes isn't available on tab 1.",
            /* context: */ 'Target.setAutoAttach failed: not allowed',
        );
    });
});
