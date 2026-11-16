import { describe, expect, test } from 'vitest';
import { JwtClaims } from './JwtClaims';
import { JWT_VALIDITY } from './JwtValidity';

const NOW = new Date('2026-11-09T12:00:00Z');
const HOUR_IN_SECONDS = 3600;
const NOW_IN_SECONDS = NOW.getTime() / 1000;

describe('JwtClaims', () => {
    test.each([
        [
            'iat',
            true,
        ],
        [
            'nbf',
            true,
        ],
        [
            'exp',
            true,
        ],
        [
            'sub',
            false,
        ],
    ])('isTimeClaim_WhenTheNameIs(%s)_ShouldReturn(%s)', (name, expected) => {
        // Arrange
        const claim = name;

        // Act
        const isTimeClaim = JwtClaims.isTimeClaim(claim);

        // Assert
        expect(isTimeClaim).toBe(expected);
    });

    test('timesOf_WhenThePayloadHasTimeClaims_ShouldTurnSecondsIntoDates', () => {
        // Arrange
        const payload = {
            iat: NOW_IN_SECONDS,
            exp: NOW_IN_SECONDS + HOUR_IN_SECONDS,
            sub: '42',
        };

        // Act
        const times = JwtClaims.timesOf(payload);

        // Assert
        expect(times.map(time => `${time.label} ${time.at.toISOString()}`)).toEqual([
            'Issued at 2026-11-09T12:00:00.000Z',
            'Expires at 2026-11-09T13:00:00.000Z',
        ]);
    });

    test.each([
        [
            'an expiry ahead',
            {
                exp: NOW_IN_SECONDS + HOUR_IN_SECONDS,
            },
            JWT_VALIDITY.Valid,
        ],
        [
            'an expiry behind',
            {
                exp: NOW_IN_SECONDS - HOUR_IN_SECONDS,
            },
            JWT_VALIDITY.Expired,
        ],
        [
            'a not-before ahead',
            {
                nbf: NOW_IN_SECONDS + HOUR_IN_SECONDS,
                exp: NOW_IN_SECONDS + 2 * HOUR_IN_SECONDS,
            },
            JWT_VALIDITY.NotYetValid,
        ],
        [
            'no expiry',
            {
                sub: '42',
            },
            JWT_VALIDITY.NoExpiry,
        ],
    ])('validityOf_WhenThePayloadHas(%s)_ShouldReturn(%s)', (
        _case,
        payload,
        expected,
    ) => {
        // Arrange
        const claims: Record<string, unknown> = payload;

        // Act
        const validity = JwtClaims.validityOf(claims, NOW);

        // Assert
        expect(validity).toBe(expected);
    });
});
