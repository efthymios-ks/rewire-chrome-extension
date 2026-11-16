import { describe, expect, test } from 'vitest';
import { DefaultEventStreamParsers } from './DefaultEventStreamParsers';
import { Base64Text } from '../../../Common/Encoding/Base64Text';

describe('DefaultEventStreamParsers', () => {
    test('feed_WhenACharacterIsSplitAcrossChunks_ShouldDecodeItWhole', () => {
        // Arrange
        const parsers = new DefaultEventStreamParsers();
        parsers.start(7, 'sse-1');
        const bytes = new TextEncoder().encode('data: Γ\n\n');

        // Act
        const first = parsers.feed({
            tabId: 7,
            requestId: 'sse-1',
            base64: Base64Text.fromBytes(bytes.slice(0, 7)),
        });
        const second = parsers.feed({
            tabId: 7,
            requestId: 'sse-1',
            base64: Base64Text.fromBytes(bytes.slice(7)),
        });

        // Assert
        expect(first).toEqual([]);
        expect(second?.map(event => event.data)).toEqual(['Γ']);
    });

    test('feed_WhenTheStreamWasNeverStarted_ShouldReturnNull', () => {
        // Arrange
        const parsers = new DefaultEventStreamParsers();

        // Act
        const events = parsers.feed({
            tabId: 7,
            requestId: 'sse-9',
            base64: Base64Text.fromUtf8('data: x\n\n'),
        });

        // Assert
        expect(events).toBeNull();
    });
});
