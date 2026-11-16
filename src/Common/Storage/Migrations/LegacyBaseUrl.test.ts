import { describe, expect, test } from 'vitest';
import { LegacyBaseUrl } from './LegacyBaseUrl';

describe('LegacyBaseUrl', () => {
    test.each([
        [
            ' https://api.example.com/v1// ',
            'https://api.example.com/v1',
        ],
        [
            'https://api.example.com',
            'https://api.example.com',
        ],
        [
            '',
            '',
        ],
    ])('trimmed_WhenTheBaseIs(%j)_ShouldReturn(%j)', (base, expected) => {
        // Act
        const trimmed = LegacyBaseUrl.trimmed(base);

        // Assert
        expect(trimmed).toBe(expected);
    });

    test('mirrorRegex_WhenGivenABase_ShouldEscapeItAndCaptureTheRest', () => {
        // Act
        const regex = LegacyBaseUrl.mirrorRegex('https://api.example.com/v1/');

        // Assert
        expect(regex).toBe('^https://api\\.example\\.com/v1((?:[/?#].*)?)$');
    });

    test('mirrorRegex_WhenAppliedToAUrlUnderTheBase_ShouldCaptureThePathAndQuery', () => {
        // Arrange
        const regex = new RegExp(LegacyBaseUrl.mirrorRegex('https://api.example.com/v1'));

        // Act
        const match = regex.exec('https://api.example.com/v1/users?page=2');

        // Assert
        expect(match?.[1]).toBe('/users?page=2');
    });

    test('mirrorTarget_WhenGivenABase_ShouldAppendTheCapturedRest', () => {
        // Act
        const target = LegacyBaseUrl.mirrorTarget(' http://localhost:5000/ ');

        // Assert
        expect(target).toBe('http://localhost:5000$1');
    });
});
