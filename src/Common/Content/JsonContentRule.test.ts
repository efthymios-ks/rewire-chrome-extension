import { describe, expect, test } from 'vitest';
import { CONTENT_KIND } from '../../Contracts/Timeline/ContentKind';
import type { ContentSignals } from './ContentSignals';
import { JsonContentRule } from './JsonContentRule';

function aSignals(overrides: Partial<ContentSignals> = {}): ContentSignals {
    return {
        url: 'https://api.example.com/users',
        requestContentType: '',
        responseMimeType: '',
        requestBody: null,
        ...overrides,
    };
}

describe('JsonContentRule', () => {
    test('kind_WhenRead_ShouldBeJson', () => {
        // Act
        const kind = new JsonContentRule().kind;

        // Assert
        expect(kind).toBe(CONTENT_KIND.Json);
    });

    test.each([
        [
            'application/json',
            '',
            true,
        ],
        [
            'APPLICATION/PROBLEM+JSON',
            '',
            true,
        ],
        [
            '',
            'application/json; charset=utf-8',
            true,
        ],
        [
            'text/html',
            'application/x-ndjson',
            true,
        ],
        [
            'text/html',
            'text/plain',
            false,
        ],
        [
            '',
            '',
            false,
        ],
    ])('matches_WhenResponseIs(%s)AndRequestIs(%s)_ShouldReturn(%s)', (
        responseMimeType,
        requestContentType,
        expected,
    ) => {
        // Arrange
        const signals = aSignals({
            responseMimeType,
            requestContentType,
        });

        // Act
        const matches = new JsonContentRule().matches(signals);

        // Assert
        expect(matches).toBe(expected);
    });
});
