import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { ByteSize } from '../../../Common/Encoding/ByteSize';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import { TextualMime } from '../../../Common/Http/TextualMime';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { ByteChunks } from './ByteChunks';
import type { CapturedRequestBody } from './CapturedRequestBody';
import { TIMELINE_LIMITS } from './TimelineLimits';

const GZIP_FIRST_BYTE = 0x1f;
const GZIP_SECOND_BYTE = 0x8b;
const ZLIB_FIRST_BYTE = 0x78;
const ZLIB_SECOND_BYTES = [
    0x01,
    0x5e,
    0x9c,
    0xda,
];
const MULTIPART_MARKER = 'multipart/';
const BINARY_CONTROL_CHARACTERS = /[\u0000-\u0008\u000e-\u001f]/;

interface Compression {
    name: string;
    encodings: string[];
    formats: CompressionFormat[];
    hasMagic: (bytes: Uint8Array) => boolean;
}

const COMPRESSIONS: Compression[] = [
    {
        name: 'gzip',
        encodings: [
            'gzip',
            'x-gzip',
        ],
        formats: ['gzip'],
        hasMagic: bytes => bytes[0] === GZIP_FIRST_BYTE && bytes[1] === GZIP_SECOND_BYTE,
    },
    {
        name: 'deflate',
        encodings: ['deflate'],
        formats: [
            'deflate',
            'deflate-raw',
        ],
        hasMagic: bytes => bytes[0] === ZLIB_FIRST_BYTE && ZLIB_SECOND_BYTES.includes(bytes[1] ?? -1),
    },
];

type DecodedBody = Omit<CapturedRequestBody, 'requestBodyByteSize'>;

interface Inflated {
    bytes: Uint8Array;
    isTruncated: boolean;
}

export interface DecodeOptions {
    bytes: Uint8Array;
    headers: HeaderEntry[];
}

function strictTextOf(bytes: Uint8Array, isPartial: boolean): string | null {
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: isPartial });

        return BINARY_CONTROL_CHARACTERS.test(text) ? null : text;
    } catch {
        return null;
    }
}

function hasTextualType(headers: HeaderEntry[]): boolean {
    const contentType = HeaderLookup.find(headers, HEADER_NAMES.ContentType) ?? '';

    return TextualMime.isTextual(contentType) || contentType.toLowerCase().includes(MULTIPART_MARKER);
}

interface TextOfOptions {
    bytes: Uint8Array;
    headers: HeaderEntry[];
    isPartial?: boolean;
}

function textOf({ bytes, headers, isPartial = false }: TextOfOptions): string | null {
    const strict = strictTextOf(bytes, isPartial);
    if (strict != null) {
        return strict;
    }

    return hasTextualType(headers)
        ? new TextDecoder().decode(bytes, { stream: isPartial })
        : null;
}

function compressionOf({ bytes, headers }: DecodeOptions): Compression | null {
    const encoding = (HeaderLookup.find(headers, HEADER_NAMES.ContentEncoding) ?? '').trim().toLowerCase();
    const declared = COMPRESSIONS.find(compression => compression.encodings.includes(encoding));
    if (declared != null) {
        return declared;
    }

    // Text that merely starts like a zlib header (e.g. "x^") is still text.
    if (strictTextOf(bytes, false) != null) {
        return null;
    }

    return COMPRESSIONS.find(compression => compression.hasMagic(bytes)) ?? null;
}

interface BinaryOfOptions {
    bytes: Uint8Array;
    lead: string;
    isTruncated?: boolean;
}

function binaryOf({ bytes, lead, isTruncated = false }: BinaryOfOptions): DecodedBody {
    const kept = bytes.subarray(0, TIMELINE_LIMITS.MaxDecodedBodyBytes);
    const isCut = isTruncated || kept.length < bytes.length;

    return {
        requestBody: null,
        requestBodyNote: isCut ? `${lead}, showing the first ${ByteSize.textOf(kept.length)}.` : `${lead}.`,
        requestBodyBase64: Base64Text.fromBytes(kept),
    };
}

function binaryLeadOf(bytes: Uint8Array): string {
    return `Binary body · ${ByteSize.textOf(bytes.length)}`;
}

async function inflateAsAsync(bytes: Uint8Array, format: CompressionFormat): Promise<Inflated | null> {
    const limit = TIMELINE_LIMITS.MaxDecodedBodyBytes;
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
        const reader = new Blob([new Uint8Array(bytes)])
            .stream()
            .pipeThrough(new DecompressionStream(format))
            .getReader();
        for (let read = await reader.read(); !read.done; read = await reader.read()) {
            chunks.push(read.value);
            length += read.value.length;
            if (length > limit) {
                await reader.cancel();

                return {
                    bytes: ByteChunks.join(chunks).subarray(0, limit),
                    isTruncated: true,
                };
            }
        }
    } catch {
        return null;
    }

    return {
        bytes: ByteChunks.join(chunks),
        isTruncated: false,
    };
}

async function inflateAsync(bytes: Uint8Array, formats: CompressionFormat[]): Promise<Inflated | null> {
    for (const format of formats) {
        const inflated = await inflateAsAsync(bytes, format);
        if (inflated != null) {
            return inflated;
        }
    }

    return null;
}

interface DecompressedOfOptions {
    compression: Compression;
    compressedLength: number;
    inflated: Inflated;
    headers: HeaderEntry[];
}

function decompressedOf(options: DecompressedOfOptions): DecodedBody {
    const { compression, compressedLength, inflated, headers } = options;
    const { bytes, isTruncated } = inflated;
    const keptSize = ByteSize.textOf(bytes.length);
    const inflatedSize = isTruncated ? `over ${keptSize}` : keptSize;
    const compressedSize = ByteSize.textOf(compressedLength);
    const origin = `Decompressed from ${compression.name} (${compressedSize} → ${inflatedSize})`;
    const text = textOf({
        bytes,
        headers,
        isPartial: isTruncated,
    });
    if (text == null) {
        return binaryOf({
            bytes,
            lead: `${origin}, binary body`,
            isTruncated,
        });
    }

    return {
        requestBody: text,
        requestBodyNote: isTruncated
            ? `${origin}, body truncated to ${keptSize}.`
            : `${origin}.`,
        requestBodyBase64: null,
    };
}

function plainOf(options: DecodeOptions): DecodedBody {
    const { bytes, headers } = options;
    const text = compressionOf(options) == null ? textOf({ bytes, headers }) : null;
    if (text == null) {
        return binaryOf({
            bytes,
            lead: binaryLeadOf(bytes),
        });
    }

    return {
        requestBody: text,
        requestBodyNote: null,
        requestBodyBase64: null,
    };
}

async function inflatedOrPlainOfAsync(options: DecodeOptions): Promise<DecodedBody> {
    const compression = compressionOf(options);
    if (compression == null) {
        return plainOf(options);
    }

    const { bytes, headers } = options;
    const inflated = await inflateAsync(bytes, compression.formats);
    if (inflated == null) {
        return binaryOf({
            bytes,
            lead: `${binaryLeadOf(bytes)}, could not decompress it as ${compression.name}`,
        });
    }

    return decompressedOf({
        compression,
        compressedLength: bytes.length,
        inflated,
        headers,
    });
}

function capturedOf(decoded: DecodedBody, sentBytes: Uint8Array): CapturedRequestBody {
    return {
        ...decoded,
        requestBodyByteSize: sentBytes.length,
    };
}

export const RequestBodyDecoder = {
    isCompressed(options: DecodeOptions): boolean {
        return compressionOf(options) != null;
    },

    // Never decompresses: a compressed body stays a binary summary until decodeAsync runs.
    decode(options: DecodeOptions): CapturedRequestBody {
        return capturedOf(plainOf(options), options.bytes);
    },

    async decodeAsync(options: DecodeOptions): Promise<CapturedRequestBody> {
        return capturedOf(await inflatedOrPlainOfAsync(options), options.bytes);
    },
};
