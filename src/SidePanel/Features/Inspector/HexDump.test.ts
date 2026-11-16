import { describe, expect, test } from 'vitest';
import { HexDump } from './HexDump';

const GZIP_HEADER = [
    0x1f,
    0x8b,
    0x08,
    0x00,
];

function bytesOf(...parts: (number[] | string)[]): Uint8Array {
    return new Uint8Array(parts.flatMap(part => typeof part === 'string'
        ? [...new TextEncoder().encode(part)]
        : part));
}

describe('HexDump', () => {
    test('of_WhenGivenAFullLine_ShouldShowTheOffsetTheHexBytesAndTheAscii', () => {
        // Arrange
        const bytes = bytesOf(GZIP_HEADER, 'Hello, world');

        // Act
        const dump = HexDump.of(bytes);

        // Assert
        expect(dump).toBe('00000000  1f 8b 08 00 48 65 6c 6c  6f 2c 20 77 6f 72 6c 64  |....Hello, world|');
    });

    test('of_WhenTheLastLineIsShort_ShouldPadItSoTheAsciiColumnLinesUp', () => {
        // Arrange
        const bytes = bytesOf(GZIP_HEADER, 'Hello, world', [
            0x7f,
            0x41,
            0x0a,
        ]);

        // Act
        const dump = HexDump.of(bytes);

        // Assert
        expect(dump.split('\n')).toEqual([
            '00000000  1f 8b 08 00 48 65 6c 6c  6f 2c 20 77 6f 72 6c 64  |....Hello, world|',
            `00000010  7f 41 0a${' '.repeat(42)}|.A.|`,
        ]);
    });

    test('of_WhenTheBytesAreNotAscii_ShouldShowDotsInTheTextColumn', () => {
        // Arrange
        const bytes = bytesOf('é');

        // Act
        const dump = HexDump.of(bytes);

        // Assert
        expect(dump.endsWith('|..|')).toBe(true);
        expect(dump.startsWith('00000000  c3 a9 ')).toBe(true);
    });

    test('of_WhenGivenNoBytes_ShouldReturnNothing', () => {
        // Arrange
        const bytes = new Uint8Array([]);

        // Act
        const dump = HexDump.of(bytes);

        // Assert
        expect(dump).toBe('');
    });
});
