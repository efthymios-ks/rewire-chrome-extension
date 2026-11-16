import { describe, expect, test } from 'vitest';
import { JwtStatusText } from './JwtStatusText';

const NOW = new Date('2026-11-09T12:00:00Z');
const NOW_IN_SECONDS = NOW.getTime() / 1000;
const HOUR_IN_SECONDS = 3600;

describe('JwtStatusText', () => {
    test.each([
        [
            {
                exp: NOW_IN_SECONDS + HOUR_IN_SECONDS,
            },
            'Valid until 2026-11-09T13:00:00Z',
        ],
        [
            {
                exp: NOW_IN_SECONDS - HOUR_IN_SECONDS,
            },
            'Expired at 2026-11-09T11:00:00Z',
        ],
        [
            {
                nbf: NOW_IN_SECONDS + HOUR_IN_SECONDS,
            },
            'Not valid before 2026-11-09T13:00:00Z',
        ],
        [
            {},
            'Never expires',
        ],
    ])('of_WhenThePayloadIs(%j)_ShouldSay(%s)', (payload, expected) => {
        // Arrange
        const claims: Record<string, unknown> = payload;

        // Act
        const text = JwtStatusText.of(claims, NOW);

        // Assert
        expect(text).toBe(expected);
    });
});
