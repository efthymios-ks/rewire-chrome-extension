import { describe, expect, test } from 'vitest';
import { RequestBodyDecoder } from './RequestBodyDecoder';
import { TIMELINE_LIMITS } from './TimelineLimits';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { binaryBytesOf, compressAsync, utf8Of } from '../../BackgroundTestData';

const EVENTS_TEXT = '{"events":['
    + '{"type":"click","label":"Ελληνικά ✓","index":0},'
    + '{"type":"click","label":"Ελληνικά ✓","index":1},'
    + '{"type":"click","label":"Ελληνικά ✓","index":2},'
    + '{"type":"click","label":"Ελληνικά ✓","index":3}'
    + ']}';
// EVENTS_TEXT as produced by Node's zlib.gzipSync, so a real gzip writer is covered too.
const EVENTS_GZIP_BASE64 = 'H4sIAAAAAAAACqtWSi1LzSspVrKKrlYqqSxIVbJSSs7JTM5W0lHKSUxKzVGyUjo39dzuc7vPbT+399zOc7vOrVF4NGeyko5SZl5'
    + 'KaoWSlUGtDpk6DcnWaUS2TuPa2FoAtyWvtPQAAAA=';
const MESSAGE_TEXT = '{"message":"hello"}';
const CAP = TIMELINE_LIMITS.MaxDecodedBodyBytes;

function headersOf(record: Record<string, string>): HeaderEntry[] {
    return Object
        .entries(record)
        .map(([name, value]) => ({
            name,
            value,
        }));
}

describe('RequestBodyDecoder', () => {
    test('decodeAsync_WhenTheBodyIsGzipFromZlib_ShouldStoreTheDecompressedTextAndANote', async () => {
        // Arrange
        const bytes = Base64Text.toBytes(EVENTS_GZIP_BASE64);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes, headers: [] });

        // Assert
        expect(captured).toEqual({
            requestBody: EVENTS_TEXT,
            requestBodyNote: 'Decompressed from gzip (104 bytes → 244 bytes).',
            requestBodyBase64: null,
            requestBodyByteSize: 104,
        });
    });

    test('decodeAsync_WhenContentEncodingIsGzip_ShouldDecompressTheBody', async () => {
        // Arrange
        const bytes = await compressAsync(MESSAGE_TEXT, 'gzip');

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes,
            headers: headersOf({
                'Content-Type': 'application/json',
                'Content-Encoding': 'gzip',
            }),
        });

        // Assert
        expect(captured.requestBody).toBe(MESSAGE_TEXT);
        expect(captured.requestBodyNote).toBe(`Decompressed from gzip (${bytes.length} bytes → 19 bytes).`);
        expect(captured.requestBodyByteSize).toBe(bytes.length);
    });

    test('decodeAsync_WhenContentEncodingIsDeflate_ShouldDecompressZlibData', async () => {
        // Arrange
        const bytes = await compressAsync(MESSAGE_TEXT, 'deflate');

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes,
            headers: headersOf({
                'Content-Encoding': 'deflate',
            }),
        });

        // Assert
        expect(captured.requestBody).toBe(MESSAGE_TEXT);
        expect(captured.requestBodyNote)
            .toBe(`Decompressed from deflate (${bytes.length} bytes → 19 bytes).`);
    });

    test('decodeAsync_WhenDeflateDataHasNoZlibHeader_ShouldFallBackToRawDeflate', async () => {
        // Arrange
        const bytes = await compressAsync(MESSAGE_TEXT, 'deflate-raw');

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes,
            headers: headersOf({
                'Content-Encoding': 'deflate',
            }),
        });

        // Assert
        expect(captured.requestBody).toBe(MESSAGE_TEXT);
    });

    test('decodeAsync_WhenTheBytesStartWithAZlibHeader_ShouldDecompressWithoutAContentEncoding', async () => {
        // Arrange
        const bytes = await compressAsync(EVENTS_TEXT, 'deflate');

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes, headers: [] });

        // Assert
        expect(captured.requestBody).toBe(EVENTS_TEXT);
        expect(captured.requestBodyNote)
            .toBe(`Decompressed from deflate (${bytes.length} bytes → 244 bytes).`);
    });

    test('decodeAsync_WhenTheBodyIsPlainText_ShouldKeepItUnchanged', async () => {
        // Arrange
        const text = 'name=Ada&city=Athens';

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes: utf8Of(text),
            headers: headersOf({
                'Content-Type': 'application/x-www-form-urlencoded',
            }),
        });

        // Assert
        expect(captured).toEqual({
            requestBody: text,
            requestBodyNote: null,
            requestBodyBase64: null,
            requestBodyByteSize: utf8Of(text).length,
        });
    });

    test('decodeAsync_WhenTheBodyHasMultiByteCharacters_ShouldKeepItUnchanged', async () => {
        // Arrange
        const text = '{"city":"Αθήνα","price":"12 €","emoji":"🚀"}';

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes: utf8Of(text), headers: [] });

        // Assert
        expect(captured).toEqual({
            requestBody: text,
            requestBodyNote: null,
            requestBodyBase64: null,
            requestBodyByteSize: utf8Of(text).length,
        });
    });

    test('decodeAsync_WhenTextStartsLikeAZlibHeader_ShouldKeepItAsText', async () => {
        // Arrange
        const text = 'x^2 + y^2';

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes: utf8Of(text), headers: [] });

        // Assert
        expect(captured.requestBody).toBe(text);
        expect(captured.requestBodyNote).toBeNull();
    });

    test('decodeAsync_WhenTheBodyIsBinary_ShouldStoreItsBytesAndSize', async () => {
        // Arrange
        const bytes = binaryBytesOf(1234);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes,
            headers: headersOf({
                'Content-Type': 'application/octet-stream',
            }),
        });

        // Assert
        expect(captured).toEqual({
            requestBody: null,
            requestBodyNote: 'Binary body · 1,234 bytes.',
            requestBodyBase64: Base64Text.fromBytes(bytes),
            requestBodyByteSize: 1234,
        });
    });

    test('decodeAsync_WhenValidUtf8HoldsControlCharacters_ShouldTreatItAsBinary', async () => {
        // Arrange
        const protobuf = new Uint8Array([
            0x0a,
            0x05,
            0x68,
            0x65,
            0x6c,
            0x6c,
            0x6f,
        ]);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes: protobuf, headers: [] });

        // Assert
        expect(captured.requestBody).toBeNull();
        expect(captured.requestBodyNote).toBe('Binary body · 7 bytes.');
    });

    test('decodeAsync_WhenTheBinaryBodyIsOneByte_ShouldNameItInTheSingular', async () => {
        // Arrange
        const bytes = new Uint8Array([0xff]);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes, headers: [] });

        // Assert
        expect(captured.requestBodyNote).toBe('Binary body · 1 byte.');
    });

    test('decodeAsync_WhenTheBinaryBodyIsOverTheCap_ShouldKeepTheFirstBytesAndSaySo', async () => {
        // Arrange
        const bytes = binaryBytesOf(CAP + 10);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes, headers: [] });

        // Assert
        expect(captured.requestBodyNote)
            .toBe('Binary body · 1,048,586 bytes, showing the first 1,048,576 bytes.');
        expect(captured.requestBodyBase64).toBe(Base64Text.fromBytes(bytes.subarray(0, CAP)));
        expect(captured.requestBodyByteSize).toBe(CAP + 10);
    });

    test('decodeAsync_WhenDecompressionFails_ShouldTreatTheBodyAsBinary', async () => {
        // Arrange
        const truncated = (await compressAsync(EVENTS_TEXT, 'gzip')).subarray(0, 20);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes: truncated, headers: [] });

        // Assert
        expect(captured).toEqual({
            requestBody: null,
            requestBodyNote: 'Binary body · 20 bytes, could not decompress it as gzip.',
            requestBodyBase64: Base64Text.fromBytes(truncated),
            requestBodyByteSize: 20,
        });
    });

    test('decodeAsync_WhenContentEncodingClaimsGzipForPlainText_ShouldTreatTheBodyAsBinary', async () => {
        // Arrange
        const bytes = utf8Of(MESSAGE_TEXT);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes,
            headers: headersOf({
                'Content-Type': 'application/json',
                'Content-Encoding': 'gzip',
            }),
        });

        // Assert
        expect(captured.requestBody).toBeNull();
        expect(captured.requestBodyNote).toBe('Binary body · 19 bytes, could not decompress it as gzip.');
    });

    test('decodeAsync_WhenTheContentTypeIsTextualButTheBytesAreNotUtf8_ShouldDecodeThemLossily', async () => {
        // Arrange
        const latin1 = new Uint8Array([
            0x63,
            0x61,
            0x66,
            0xe9,
        ]);

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes: latin1,
            headers: headersOf({
                'Content-Type': 'text/plain; charset=iso-8859-1',
            }),
        });

        // Assert
        expect(captured).toEqual({
            requestBody: 'caf�',
            requestBodyNote: null,
            requestBodyBase64: null,
            requestBodyByteSize: 4,
        });
    });

    test('decodeAsync_WhenTheDecompressedBodyIsBinary_ShouldStoreTheDecompressedBytes', async () => {
        // Arrange
        const inner = binaryBytesOf(64);
        const bytes = await compressAsync(inner, 'gzip');

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes, headers: [] });

        // Assert
        expect(captured).toEqual({
            requestBody: null,
            requestBodyNote: `Decompressed from gzip (${bytes.length} bytes → 64 bytes), binary body.`,
            requestBodyBase64: Base64Text.fromBytes(inner),
            requestBodyByteSize: bytes.length,
        });
    });

    test('decodeAsync_WhenTheDecompressedBodyExceedsTheCap_ShouldTruncateIt', async () => {
        // Arrange
        const bytes = await compressAsync('a'.repeat(CAP + 100), 'gzip');

        // Act
        const captured = await RequestBodyDecoder.decodeAsync({ bytes, headers: [] });

        // Assert
        expect(captured.requestBody).toHaveLength(CAP);
        expect(captured.requestBodyNote).toBe(
            `Decompressed from gzip (${bytes.length.toLocaleString('en-US')} bytes → over 1,048,576 bytes), `
            + 'body truncated to 1,048,576 bytes.',
        );
        expect(captured.requestBodyByteSize).toBe(bytes.length);
    });

    test('decode_WhenTheBodyIsCompressed_ShouldSummarizeItAsBinaryUntilDecompressed', () => {
        // Arrange
        const bytes = Base64Text.toBytes(EVENTS_GZIP_BASE64);

        // Act
        const captured = RequestBodyDecoder.decode({ bytes, headers: [] });

        // Assert
        expect(captured).toEqual({
            requestBody: null,
            requestBodyNote: 'Binary body · 104 bytes.',
            requestBodyBase64: EVENTS_GZIP_BASE64,
            requestBodyByteSize: 104,
        });
    });

    test.each([
        [
            'a gzip header',
            Base64Text.toBytes(EVENTS_GZIP_BASE64),
            {},
            true,
        ],
        [
            'a declared encoding',
            utf8Of(MESSAGE_TEXT),
            {
                'Content-Encoding': ' GZIP ',
            },
            true,
        ],
        [
            'plain text',
            utf8Of(MESSAGE_TEXT),
            {},
            false,
        ],
        [
            'an unsupported encoding',
            utf8Of(MESSAGE_TEXT),
            {
                'Content-Encoding': 'br',
            },
            false,
        ],
    ])('isCompressed_WhenTheBodyHas(%s)_ShouldBe(%s)', (
        _,
        bytes,
        headers,
        expected,
    ) => {
        // Arrange
        const options = {
            bytes,
            headers: headersOf(headers),
        };

        // Act
        const isCompressed = RequestBodyDecoder.isCompressed(options);

        // Assert
        expect(isCompressed).toBe(expected);
    });
});
