import { describe, expect, test } from 'vitest';
import { Result } from './Result';

describe('Result', () => {
    test('ok_WhenGivenAValue_ShouldWrapItWithoutErrors', () => {
        // Arrange
        const value = {
            id: 42,
        };

        // Act
        const result = Result.ok(value);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value,
        });
    });

    test('ok_WhenGivenAFalsyValue_ShouldStillBeASuccess', () => {
        // Act
        const result = Result.ok(0);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: 0,
        });
    });

    test('done_WhenCalled_ShouldBeASuccessWithNoValue', () => {
        // Act
        const result = Result.done();

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: undefined,
        });
    });

    test('fail_WhenGivenAnError_ShouldCarryIt', () => {
        // Act
        const result = Result.fail('Something broke.');

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Something broke.',
        });
    });

    test('attempt_WhenTheActionReturns_ShouldWrapItsValue', () => {
        // Act
        const result = Result.attempt(() => 42);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: 42,
        });
    });

    test('attempt_WhenTheActionThrows_ShouldFailWithItsMessage', () => {
        // Act
        const result = Result.attempt(() => {
            throw new Error('Bad input');
        });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Bad input',
        });
    });

    test('attempt_WhenAPrefixIsGiven_ShouldLeadTheFailureWithIt', () => {
        // Act
        const result = Result.attempt(
            /* action: */ () => {
                throw 'denied';
            },
            /* failurePrefix: */ 'Loading failed',
        );

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Loading failed: denied',
        });
    });

    test('attemptAsync_WhenTheActionResolves_ShouldWrapItsValue', async () => {
        // Act
        const result = await Result.attemptAsync(async () => 'ready');

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: 'ready',
        });
    });

    test('attemptAsync_WhenTheActionResolvesWithNothing_ShouldMatchDone', async () => {
        // Act
        const result = await Result.attemptAsync(async () => undefined);

        // Assert
        expect(result).toEqual(Result.done());
    });

    test('attemptAsync_WhenTheActionRejects_ShouldFailWithThePrefixAndMessage', async () => {
        // Act
        const result = await Result.attemptAsync(
            /* action: */ () => Promise.reject(new Error('Quota exceeded')),
            /* failurePrefix: */ 'Saving failed',
        );

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Saving failed: Quota exceeded',
        });
    });

    test('attemptAsync_WhenTheActionThrowsBeforeAwaiting_ShouldStillFail', async () => {
        // Act
        const result = await Result.attemptAsync((): Promise<void> => {
            throw new Error('Not available');
        });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Not available',
        });
    });
});
