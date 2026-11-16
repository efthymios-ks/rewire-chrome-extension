import { describe, expect, test } from 'vitest';
import { CountText } from './CountText';

describe('CountText', () => {
    test.each([
        [
            0,
            '0 rules',
        ],
        [
            1,
            '1 rule',
        ],
        [
            2,
            '2 rules',
        ],
    ])('of_WhenTheCountIs(%s)_ShouldReturn(%s)', (count, expected) => {
        // Arrange
        const singular = 'rule';

        // Act
        const text = CountText.of({ count, singular });

        // Assert
        expect(text).toBe(expected);
    });

    test('of_WhenAPluralIsGiven_ShouldUseIt', () => {
        // Arrange
        const count = 2;

        // Act
        const text = CountText.of({ count, singular: 'entry', plural: 'entries' });

        // Assert
        expect(text).toBe('2 entries');
    });
});
