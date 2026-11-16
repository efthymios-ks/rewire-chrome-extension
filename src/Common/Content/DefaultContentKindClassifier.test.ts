import { describe, expect, test } from 'vitest';
import type { ContentSignals } from './ContentSignals';
import { DefaultContentKindClassifier } from './DefaultContentKindClassifier';
import { CONTENT_KIND } from '../../Contracts/Timeline/ContentKind';

const classifier = new DefaultContentKindClassifier();

function signals(overrides: Partial<ContentSignals>): ContentSignals {
    return {
        url: 'https://api.example.com/api/items',
        requestContentType: '',
        responseMimeType: '',
        requestBody: null,
        ...overrides,
    };
}

describe('DefaultContentKindClassifier', () => {
    test.each([
        [
            'GraphQL path',
            signals({
                url: 'https://api.example.com/graphql',
                responseMimeType: 'application/json',
            }),
            CONTENT_KIND.GraphQl,
        ],
        [
            'GraphQL body',
            signals({
                requestContentType: 'application/json',
                requestBody: '{"query":"{ me { id } }"}',
            }),
            CONTENT_KIND.GraphQl,
        ],
        [
            'batched GraphQL body',
            signals({
                requestBody: '[{"query":"{ a }"},{"query":"{ b }"}]',
            }),
            CONTENT_KIND.GraphQl,
        ],
        [
            'GraphQL content type',
            signals({
                requestContentType: 'application/graphql',
            }),
            CONTENT_KIND.GraphQl,
        ],
        [
            'multipart form',
            signals({
                requestContentType: 'multipart/form-data; boundary=x',
                responseMimeType: 'application/json',
            }),
            CONTENT_KIND.FormData,
        ],
        [
            'urlencoded form',
            signals({
                requestContentType: 'application/x-www-form-urlencoded',
            }),
            CONTENT_KIND.FormData,
        ],
        [
            'JSON response',
            signals({
                responseMimeType: 'application/problem+json',
            }),
            CONTENT_KIND.Json,
        ],
        [
            'plain text',
            signals({
                responseMimeType: 'text/plain',
            }),
            CONTENT_KIND.Other,
        ],
    ])('classify_WhenRequestIs(%s)_ShouldReturnExpectedKind', (
        _name,
        input,
        expected,
    ) => {
        // Arrange
        const requestSignals = input;

        // Act
        const kind = classifier.classify(requestSignals);

        // Assert
        expect(kind).toBe(expected);
    });

    test('classify_WhenJsonBodyHasNoQueryField_ShouldReturnJson', () => {
        // Arrange
        const requestSignals = signals({
            requestContentType: 'application/json',
            requestBody: '{"name":"Ada"}',
        });

        // Act
        const kind = classifier.classify(requestSignals);

        // Assert
        expect(kind).toBe(CONTENT_KIND.Json);
    });
});
