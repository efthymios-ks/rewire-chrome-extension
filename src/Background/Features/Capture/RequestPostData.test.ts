import type { Protocol } from 'devtools-protocol';
import { describe, expect, test } from 'vitest';
import { RequestPostData } from './RequestPostData';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { aRequestWillBeSentEvent } from '../../BackgroundTestData';

function aRequest(overrides: Partial<Protocol.Network.Request>): Protocol.Network.Request {
    return {
        ...aRequestWillBeSentEvent().request,
        method: 'POST',
        ...overrides,
    };
}

describe('RequestPostData', () => {
    test('bytesOf_WhenEntriesCarryBytes_ShouldJoinThemInOrder', () => {
        // Arrange
        const request = aRequest({
            postDataEntries: [
                {
                    bytes: Base64Text.fromBytes(new Uint8Array([
                        0x1f,
                        0x8b,
                    ])),
                },
                {},
                {
                    bytes: Base64Text.fromBytes(new Uint8Array([0x08])),
                },
            ],
        });

        // Act
        const bytes = RequestPostData.bytesOf(request);

        // Assert
        expect(bytes).toEqual(new Uint8Array([
            0x1f,
            0x8b,
            0x08,
        ]));
    });

    test('bytesOf_WhenThereAreNoEntries_ShouldReturnNull', () => {
        // Arrange
        const request = aRequest({
            postData: 'name=Ada',
        });

        // Act
        const bytes = RequestPostData.bytesOf(request);

        // Assert
        expect(bytes).toBeNull();
    });

    test('bytesOf_WhenNoEntryCarriesBytes_ShouldReturnNull', () => {
        // Arrange
        const request = aRequest({
            postDataEntries: [{}],
        });

        // Act
        const bytes = RequestPostData.bytesOf(request);

        // Assert
        expect(bytes).toBeNull();
    });

    test('fetchedBytesOf_WhenThePostDataIsBase64_ShouldDecodeIt', () => {
        // Arrange
        const fetched = {
            postData: 'H4sI',
            base64Encoded: true,
        };

        // Act
        const bytes = RequestPostData.fetchedBytesOf(fetched);

        // Assert
        expect(bytes).toEqual(new Uint8Array([
            0x1f,
            0x8b,
            0x08,
        ]));
    });

    test('fetchedBytesOf_WhenThePostDataIsText_ShouldEncodeItAsUtf8', () => {
        // Arrange
        const fetched = {
            postData: 'Αθ',
            base64Encoded: false,
        };

        // Act
        const bytes = RequestPostData.fetchedBytesOf(fetched);

        // Assert
        expect(bytes).toEqual(new Uint8Array([
            0xce,
            0x91,
            0xce,
            0xb8,
        ]));
    });
});
