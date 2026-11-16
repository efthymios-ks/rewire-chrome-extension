const BYTES_PER_LINE = 16;
const BYTES_PER_GROUP = 8;
const OFFSET_DIGITS = 8;
const BYTE_DIGITS = 2;
const HEX_RADIX = 16;
const FIRST_PRINTABLE = 0x20;
const LAST_PRINTABLE = 0x7e;
const MISSING_CELL = '  ';
const UNPRINTABLE = '.';
const LINE_SEPARATOR = '\n';

function cellOf(byte: number | undefined): string {
    return byte == null ? MISSING_CELL : byte.toString(HEX_RADIX).padStart(BYTE_DIGITS, '0');
}

function characterOf(byte: number): string {
    return byte >= FIRST_PRINTABLE && byte <= LAST_PRINTABLE ? String.fromCharCode(byte) : UNPRINTABLE;
}

function lineAt(bytes: Uint8Array, offset: number): string {
    const line = bytes.subarray(offset, offset + BYTES_PER_LINE);
    const cells = Array.from({ length: BYTES_PER_LINE }, (_, index) => cellOf(line[index]));
    const hex = `${cells.slice(0, BYTES_PER_GROUP).join(' ')}  ${cells.slice(BYTES_PER_GROUP).join(' ')}`;
    const text = Array
        .from(line, byte => characterOf(byte))
        .join('');

    return `${offset.toString(HEX_RADIX).padStart(OFFSET_DIGITS, '0')}  ${hex}  |${text}|`;
}

export const HexDump = {
    of(bytes: Uint8Array): string {
        return Array
            .from(
                /* arrayLike: */ { length: Math.ceil(bytes.length / BYTES_PER_LINE) },
                /* mapfn: */ (_, index) => lineAt(bytes, index * BYTES_PER_LINE),
            )
            .join(LINE_SEPARATOR);
    },
};
