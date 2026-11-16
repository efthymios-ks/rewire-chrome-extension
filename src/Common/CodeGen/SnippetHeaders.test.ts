import { describe, expect, test } from 'vitest';
import { SnippetHeaders } from './SnippetHeaders';

const HEADERS = [
    {
        name: ':authority',
        value: 'api.example.com',
    },
    {
        name: 'Host',
        value: 'api.example.com',
    },
    {
        name: 'Content-Length',
        value: '13',
    },
    {
        name: 'Accept',
        value: '*/*',
    },
    {
        name: 'X-Tenant',
        value: 'blue',
    },
];

describe('SnippetHeaders', () => {
    test('sendable_WhenTransportAndPseudoHeadersWereCaptured_ShouldLeaveThemOut', () => {
        // Arrange
        const headers = HEADERS;

        // Act
        const sendable = SnippetHeaders.sendable(headers);

        // Assert
        expect(sendable.map(header => header.name)).toEqual([
            'Accept',
            'X-Tenant',
        ]);
    });

    test('find_WhenTheNameDiffersInCase_ShouldStillFindTheHeader', () => {
        // Arrange
        const name = 'x-tenant';

        // Act
        const header = SnippetHeaders.find(HEADERS, name);

        // Assert
        expect(header?.value).toBe('blue');
    });

    test('without_WhenGivenNames_ShouldDropThoseHeaders', () => {
        // Arrange
        const names = [
            'accept',
            'host',
        ];

        // Act
        const kept = SnippetHeaders.without(HEADERS, names);

        // Assert
        expect(kept.map(header => header.name)).toEqual([
            ':authority',
            'Content-Length',
            'X-Tenant',
        ]);
    });

    test('forSnippet_WhenTheRequestCarriesContentEncoding_ShouldDropItWithTheTransportHeaders', () => {
        // Arrange
        const headers = [
            ...HEADERS,
            {
                name: 'content-encoding',
                value: 'gzip',
            },
        ];

        // Act
        const kept = SnippetHeaders.forSnippet(headers);

        // Assert
        expect(kept.map(header => header.name)).toEqual([
            'Accept',
            'X-Tenant',
        ]);
    });

    test('sendable_WhenTheRequestCarriesContentEncoding_ShouldKeepIt', () => {
        // Arrange
        const headers = [
            {
                name: 'Content-Encoding',
                value: 'gzip',
            },
        ];

        // Act
        const sendable = SnippetHeaders.sendable(headers);

        // Assert
        expect(sendable).toEqual(headers);
    });
});
