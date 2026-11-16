import { describe, expect, test } from 'vitest';
import { CONTENT_KIND } from '../../Contracts/Timeline/ContentKind';
import type { ContentSignals } from './ContentSignals';
import { GraphQlContentRule } from './GraphQlContentRule';

function aSignals(overrides: Partial<ContentSignals> = {}): ContentSignals {
    return {
        url: 'https://api.example.com/users',
        requestContentType: 'application/json',
        responseMimeType: 'application/json',
        requestBody: null,
        ...overrides,
    };
}

describe('GraphQlContentRule', () => {
    test('kind_WhenRead_ShouldBeGraphQl', () => {
        // Act
        const kind = new GraphQlContentRule().kind;

        // Assert
        expect(kind).toBe(CONTENT_KIND.GraphQl);
    });

    test.each([
        [
            'https://api.example.com/graphql',
            true,
        ],
        [
            'https://api.example.com/GraphQL/',
            true,
        ],
        [
            'https://api.example.com/v1/graphql?op=Users',
            true,
        ],
        [
            'https://api.example.com/graphql/batch',
            true,
        ],
        [
            'https://api.example.com/graphqlish',
            false,
        ],
        [
            'https://api.example.com/users?path=/graphql',
            false,
        ],
        [
            'not a url /graphql',
            false,
        ],
    ])('matches_WhenUrlIs(%s)_ShouldReturn(%s)', (url, expected) => {
        // Arrange
        const signals = aSignals({
            url,
        });

        // Act
        const matches = new GraphQlContentRule().matches(signals);

        // Assert
        expect(matches).toBe(expected);
    });

    test.each([
        [
            'application/graphql',
            true,
        ],
        [
            'Application/GraphQL; charset=utf-8',
            true,
        ],
        [
            'text/plain',
            false,
        ],
    ])('matches_WhenRequestContentTypeIs(%s)_ShouldReturn(%s)', (requestContentType, expected) => {
        // Arrange
        const signals = aSignals({
            requestContentType,
        });

        // Act
        const matches = new GraphQlContentRule().matches(signals);

        // Assert
        expect(matches).toBe(expected);
    });

    test.each([
        [
            '{"query":"{ users { id } }"}',
            true,
        ],
        [
            '{"query":"","variables":{}}',
            true,
        ],
        [
            '[{"query":"{ a }"},{"query":"{ b }"}]',
            true,
        ],
        [
            '[{"query":"{ a }"},{"name":"b"}]',
            false,
        ],
        [
            '[]',
            false,
        ],
        [
            '{"query":42}',
            false,
        ],
        [
            '{"name":"Ann"}',
            false,
        ],
        [
            'null',
            false,
        ],
        [
            '"query"',
            false,
        ],
        [
            '{"query": broken',
            false,
        ],
        [
            '',
            false,
        ],
    ])('matches_WhenRequestBodyIs(%s)_ShouldReturn(%s)', (requestBody, expected) => {
        // Arrange
        const signals = aSignals({
            requestBody,
        });

        // Act
        const matches = new GraphQlContentRule().matches(signals);

        // Assert
        expect(matches).toBe(expected);
    });

    test('matches_WhenNoSignalPointsToGraphQl_ShouldReturnFalse', () => {
        // Arrange
        const signals = aSignals();

        // Act
        const matches = new GraphQlContentRule().matches(signals);

        // Assert
        expect(matches).toBe(false);
    });
});
