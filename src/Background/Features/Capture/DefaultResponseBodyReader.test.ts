import { describe, expect, test } from 'vitest';
import { DefaultResponseBodyReader } from './DefaultResponseBodyReader';
import { TIMELINE_LIMITS } from './TimelineLimits';
import { Result } from '../../../Common/Results/Result';
import { createDebuggerClientMock } from '../../BackgroundTestData';

const TAB_ID = 7;
const REQUEST_ID = 'request-1';

describe('DefaultResponseBodyReader', () => {
    test.each([
        [
            'image/png',
            'Body not captured, "image/png" is not text.',
        ],
        [
            '',
            'Body not captured, "no content type" is not text.',
        ],
    ])('readAsync_WhenTheMimeTypeIsNotText(%s)_ShouldSkipTheBody', async (mimeType, expectedNote) => {
        // Arrange
        const { client, send } = createDebuggerClientMock();
        const reader = new DefaultResponseBodyReader(client);

        // Act
        const captured = await reader.readAsync({ tabId: TAB_ID, requestId: REQUEST_ID, mimeType });

        // Assert
        expect(captured).toEqual({
            body: null,
            note: expectedNote,
        });
        expect(send).not.toHaveBeenCalled();
    });

    test('readAsync_WhenTheBodyIsPlainText_ShouldReturnIt', async () => {
        // Arrange
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.ok({
            body: '{"id":42}',
            base64Encoded: false,
        }));
        const reader = new DefaultResponseBodyReader(client);

        // Act
        const captured = await reader.readAsync({
            tabId: TAB_ID,
            requestId: REQUEST_ID,
            mimeType: 'application/json',
        });

        // Assert
        expect(captured).toEqual({
            body: '{"id":42}',
            note: null,
        });
        expect(send).toHaveBeenCalledWith(
            /* tabId: */ TAB_ID,
            /* command: */ 'Network.getResponseBody',
            /* params: */ {
                requestId: REQUEST_ID,
            },
        );
    });

    test.each([
        'text/html',
        'application/xhtml+xml',
    ])('readAsync_WhenThePageIs(%s)_ShouldReturnItsMarkup', async mimeType => {
        // Arrange
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.ok({
            body: '<!doctype html><title>Flights</title>',
            base64Encoded: false,
        }));
        const reader = new DefaultResponseBodyReader(client);

        // Act
        const captured = await reader.readAsync({ tabId: TAB_ID, requestId: REQUEST_ID, mimeType });

        // Assert
        expect(captured).toEqual({
            body: '<!doctype html><title>Flights</title>',
            note: null,
        });
    });

    test('readAsync_WhenTheBodyIsBase64Encoded_ShouldDecodeIt', async () => {
        // Arrange
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.ok({
            body: 'eyJpZCI6NDJ9',
            base64Encoded: true,
        }));
        const reader = new DefaultResponseBodyReader(client);

        // Act
        const captured = await reader.readAsync({
            tabId: TAB_ID,
            requestId: REQUEST_ID,
            mimeType: 'application/json',
        });

        // Assert
        expect(captured).toEqual({
            body: '{"id":42}',
            note: null,
        });
    });

    test('readAsync_WhenTheBodyIsTooLong_ShouldTruncateItAndSaySo', async () => {
        // Arrange
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.ok({
            body: 'a'.repeat(TIMELINE_LIMITS.MaxBodyLength + 1),
            base64Encoded: false,
        }));
        const reader = new DefaultResponseBodyReader(client);

        // Act
        const captured = await reader.readAsync({
            tabId: TAB_ID,
            requestId: REQUEST_ID,
            mimeType: 'text/plain',
        });

        // Assert
        expect(captured.body).toHaveLength(TIMELINE_LIMITS.MaxBodyLength);
        expect(captured.note).toBe(`Body truncated to ${TIMELINE_LIMITS.MaxBodyLength} characters.`);
    });

    test('readAsync_WhenTheBodyIsExactlyAtTheLimit_ShouldKeepItWhole', async () => {
        // Arrange
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.ok({
            body: 'a'.repeat(TIMELINE_LIMITS.MaxBodyLength),
            base64Encoded: false,
        }));
        const reader = new DefaultResponseBodyReader(client);

        // Act
        const captured = await reader.readAsync({
            tabId: TAB_ID,
            requestId: REQUEST_ID,
            mimeType: 'text/plain',
        });

        // Assert
        expect(captured.body).toHaveLength(TIMELINE_LIMITS.MaxBodyLength);
        expect(captured.note).toBeNull();
    });

    test('readAsync_WhenTheDebuggerFails_ShouldExplainWhy', async () => {
        // Arrange
        const { client, send } = createDebuggerClientMock();
        send.mockResolvedValue(Result.fail('No resource with given identifier found'));
        const reader = new DefaultResponseBodyReader(client);

        // Act
        const captured = await reader.readAsync({
            tabId: TAB_ID,
            requestId: REQUEST_ID,
            mimeType: 'application/json',
        });

        // Assert
        expect(captured).toEqual({
            body: null,
            note: 'Body unavailable: No resource with given identifier found',
        });
    });
});
