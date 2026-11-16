import type { Protocol } from 'devtools-protocol';
import { describe, expect, test } from 'vitest';
import { PausedDrafts } from './PausedDrafts';
import { TEST_URLS } from '../../../TestData';
import { aPausedEvent } from '../../BackgroundTestData';

function aPostEvent(body: Partial<Protocol.Network.Request>): Protocol.Fetch.RequestPausedEvent {
    return aPausedEvent({
        request: {
            url: TEST_URLS.UsersProfile,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            initialPriority: 'High',
            referrerPolicy: 'strict-origin-when-cross-origin',
            ...body,
        },
    });
}

describe('PausedDrafts', () => {
    test('requestOf_WhenTheRequestHasNoBody_ShouldMapItWithANullBody', () => {
        // Arrange
        const event = aPausedEvent();

        // Act
        const draft = PausedDrafts.requestOf(event);

        // Assert
        expect(draft).toEqual({
            url: TEST_URLS.UsersProfile,
            method: 'GET',
            headers: [
                {
                    name: 'Accept',
                    value: 'application/json',
                },
            ],
            body: null,
            resourceType: 'Fetch',
            response: null,
        });
    });

    test('requestOf_WhenTheRequestHasPostData_ShouldUseIt', () => {
        // Arrange
        const event = aPostEvent({
            postData: '{"id":42}',
            postDataEntries: [
                {
                    bytes: 'aWdub3JlZA==',
                },
            ],
        });

        // Act
        const draft = PausedDrafts.requestOf(event);

        // Assert
        expect(draft.body).toBe('{"id":42}');
    });

    test('requestOf_WhenTheBodyComesInEntries_ShouldDecodeAndJoinThem', () => {
        // Arrange
        const event = aPostEvent({
            postDataEntries: [
                {
                    bytes: 'eyJpZCI6',
                },
                {},
                {
                    bytes: 'NDJ9',
                },
            ],
        });

        // Act
        const draft = PausedDrafts.requestOf(event);

        // Assert
        expect(draft.body).toBe('{"id":42}');
    });

    test('requestOf_WhenTheEntriesAreEmpty_ShouldHaveANullBody', () => {
        // Arrange
        const event = aPostEvent({
            postDataEntries: [],
        });

        // Act
        const draft = PausedDrafts.requestOf(event);

        // Assert
        expect(draft.body).toBeNull();
    });

    test('responseOf_WhenTheResponseArrived_ShouldMapItsStatusAndHeaders', () => {
        // Arrange
        const event = aPausedEvent({
            responseStatusCode: 404,
            responseHeaders: [
                {
                    name: 'Content-Type',
                    value: 'text/plain',
                },
            ],
        });

        // Act
        const draft = PausedDrafts.responseOf(event, 'Not found');

        // Assert
        expect(draft).toEqual({
            status: 404,
            headers: [
                {
                    name: 'Content-Type',
                    value: 'text/plain',
                },
            ],
            body: 'Not found',
            errorReason: null,
        });
    });

    test('responseOf_WhenTheRequestFailed_ShouldUseStatusZeroAndTheErrorReason', () => {
        // Arrange
        const event = aPausedEvent({
            responseErrorReason: 'ConnectionRefused',
        });

        // Act
        const draft = PausedDrafts.responseOf(event, null);

        // Assert
        expect(draft).toEqual({
            status: 0,
            headers: [],
            body: null,
            errorReason: 'ConnectionRefused',
        });
    });
});
