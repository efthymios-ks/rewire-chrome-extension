import { describe, expect, test } from 'vitest';
import { EndpointKey } from './EndpointKey';

describe('EndpointKey', () => {
    test('create_WhenUrlHasQuery_ShouldDropQueryAndUppercaseMethod', () => {
        // Arrange
        const url = 'https://api.example.com/api/v1/orders?page=2#top';

        // Act
        const key = EndpointKey.create('post', url);

        // Assert
        expect(key).toBe('POST https://api.example.com/api/v1/orders');
    });

    test('create_WhenUrlDoesNotParse_ShouldKeepRawText', () => {
        // Arrange
        const url = 'not a url';

        // Act
        const key = EndpointKey.create('GET', url);

        // Assert
        expect(key).toBe('GET not a url');
    });

    test('parse_WhenGivenACreatedKey_ShouldSplitTheMethodFromTheUrl', () => {
        // Arrange
        const key = EndpointKey.create('post', 'https://api.example.com/api/v1/orders?page=2');

        // Act
        const parts = EndpointKey.parse(key);

        // Assert
        expect(parts).toEqual({
            method: 'POST',
            url: 'https://api.example.com/api/v1/orders',
        });
    });

    test('parse_WhenTheUrlHasSpaces_ShouldSplitOnlyOnTheFirstOne', () => {
        // Act
        const parts = EndpointKey.parse('GET not a url');

        // Assert
        expect(parts).toEqual({
            method: 'GET',
            url: 'not a url',
        });
    });
});
