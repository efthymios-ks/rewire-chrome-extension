import { describe, expect, test } from 'vitest';
import { Durations } from './Durations';

describe('Durations', () => {
    test.each([
        [
            100,
            101,
            1000,
        ],
        [
            0,
            0.25,
            250,
        ],
        [
            0,
            0.0014,
            1,
        ],
        [
            100,
            100,
            0,
        ],
        [
            100,
            99,
            0,
        ],
    ])('betweenTimestamps_WhenTheTimestampsAre(%s,%s)_ShouldBe(%s)Milliseconds', (
        startedTimestamp,
        endedTimestamp,
        expected,
    ) => {
        // Arrange
        const started = startedTimestamp;

        // Act
        const duration = Durations.betweenTimestamps(started, endedTimestamp);

        // Assert
        expect(duration).toBe(expected);
    });
});
