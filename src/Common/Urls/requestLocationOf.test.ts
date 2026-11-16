import { describe, expect, test } from 'vitest';
import { requestLocationOf } from './requestLocationOf';

describe('requestLocationOf', () => {
    test('requestLocationOf_WhenTheUrlParses_ShouldSplitHostPathAndEndpointKey', () => {
        // Act
        const location = requestLocationOf('post', 'https://api.example.com/api/v1/orders?page=2#top');

        // Assert
        expect(location).toEqual({
            method: 'post',
            url: 'https://api.example.com/api/v1/orders?page=2#top',
            host: 'api.example.com',
            path: '/api/v1/orders?page=2',
            endpointKey: 'POST https://api.example.com/api/v1/orders',
        });
    });

    test('requestLocationOf_WhenTheUrlDoesNotParse_ShouldKeepTheRawTextAsThePath', () => {
        // Act
        const location = requestLocationOf('GET', 'not a url');

        // Assert
        expect(location).toEqual({
            method: 'GET',
            url: 'not a url',
            host: '',
            path: 'not a url',
            endpointKey: 'GET not a url',
        });
    });
});
