import { describe, expect, test } from 'vitest';
import { DurationText } from './DurationText';

describe('DurationText', () => {
    test('of_WhenTheDurationIsUnknown_ShouldShowItIsPending', () => {
        // Arrange
        const milliseconds = null;

        // Act
        const text = DurationText.of(milliseconds);

        // Assert
        expect(text).toBe('...');
    });

    test('of_WhenZero_ShouldShowZeroMilliseconds', () => {
        // Arrange
        const milliseconds = 0;

        // Act
        const text = DurationText.of(milliseconds);

        // Assert
        expect(text).toBe('0 ms');
    });

    test('of_WhenUnderASecond_ShouldShowMilliseconds', () => {
        // Arrange
        const milliseconds = 999;

        // Act
        const text = DurationText.of(milliseconds);

        // Assert
        expect(text).toBe('999 ms');
    });

    test('of_WhenExactlyASecond_ShouldShowSecondsWithTwoDecimals', () => {
        // Arrange
        const milliseconds = 1000;

        // Act
        const text = DurationText.of(milliseconds);

        // Assert
        expect(text).toBe('1.00 s');
    });

    test('of_WhenOverASecond_ShouldRoundToTwoDecimals', () => {
        // Arrange
        const milliseconds = 12_345;

        // Act
        const text = DurationText.of(milliseconds);

        // Assert
        expect(text).toBe('12.35 s');
    });
});
