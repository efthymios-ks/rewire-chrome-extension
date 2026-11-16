import { ShellLines } from './ShellLines';

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKSLASH = '\\';
const DOLLAR = '$';
const COMMENT_MARKER = '#';
const FOREIGN_CONTINUATIONS = [
    '^',
    '`',
];
const DOUBLE_QUOTE_ESCAPABLE = [
    '$',
    '`',
    '"',
    '\\',
];
const ANSI_ESCAPES: Record<string, string> = Object.freeze({
    'n': '\n',
    'r': '\r',
    't': '\t',
    '\\': '\\',
    "'": "'",
    '"': '"',
    '?': '?',
    'a': '\x07',
    'b': '\b',
    'e': '\x1B',
    'E': '\x1B',
    'f': '\f',
    'v': '\v',
});
const ANSI_NUMBER_ESCAPES: Record<string, { pattern: RegExp; radix: number }> = {
    'x': {
        pattern: /^[0-9a-fA-F]{1,2}/,
        radix: 16,
    },
    'u': {
        pattern: /^[0-9a-fA-F]{1,4}/,
        radix: 16,
    },
    'U': {
        pattern: /^[0-9a-fA-F]{1,8}/,
        radix: 16,
    },
};
const OCTAL_PATTERN = /^[0-7]{1,3}/;
const OCTAL_RADIX = 8;

interface QuotedText {
    value: string;
    end: number;
}

function readDoubleQuoted(text: string, start: number): QuotedText | null {
    let value = '';
    let index = start;
    while (index < text.length) {
        const character = text.charAt(index);
        if (character === DOUBLE_QUOTE) {
            return {
                value,
                end: index + 1,
            };
        }

        const next = text.charAt(index + 1);
        if (character === BACKSLASH && next === ShellLines.LineBreak) {
            index += 2;
            continue;
        }

        if (character === BACKSLASH && DOUBLE_QUOTE_ESCAPABLE.includes(next)) {
            value += next;
            index += 2;
            continue;
        }

        value += character;
        index++;
    }

    return null;
}

function readAnsiEscape(text: string, index: number): QuotedText {
    const marker = text.charAt(index);
    const simple = ANSI_ESCAPES[marker];
    if (simple != null) {
        return {
            value: simple,
            end: index + 1,
        };
    }

    const numeric = ANSI_NUMBER_ESCAPES[marker];
    const digits = numeric == null
        ? OCTAL_PATTERN.exec(text.slice(index))
        : numeric.pattern.exec(text.slice(index + 1));
    if (digits == null) {
        return {
            value: `${BACKSLASH}${marker}`,
            end: index + 1,
        };
    }

    const radix = numeric?.radix ?? OCTAL_RADIX;
    const offset = numeric == null ? 0 : 1;

    return {
        value: String.fromCodePoint(parseInt(digits[0], radix)),
        end: index + offset + digits[0].length,
    };
}

function readAnsiQuoted(text: string, start: number): QuotedText | null {
    let value = '';
    let index = start;
    while (index < text.length) {
        const character = text.charAt(index);
        if (character === SINGLE_QUOTE) {
            return {
                value,
                end: index + 1,
            };
        }

        if (character === BACKSLASH) {
            const escape = readAnsiEscape(text, index + 1);
            value += escape.value;
            index = escape.end;
            continue;
        }

        value += character;
        index++;
    }

    return null;
}

function quotedTextAt(text: string, index: number): QuotedText | null | undefined {
    const character = text.charAt(index);
    if (character === DOUBLE_QUOTE) {
        return readDoubleQuoted(text, index + 1);
    }

    if (character === DOLLAR && text.charAt(index + 1) === SINGLE_QUOTE) {
        return readAnsiQuoted(text, index + 2);
    }

    return undefined;
}

export const PosixShellWords = {
    split(text: string): string[] | null {
        const source = ShellLines.normalize(text);
        const words: string[] = [];
        let word: string | null = null;
        let index = 0;
        while (index < source.length) {
            const character = source.charAt(index);
            if (ShellLines.isWhitespace(character)) {
                if (word != null) {
                    words.push(word);
                    word = null;
                }

                index++;
                continue;
            }

            if (word == null && character === COMMENT_MARKER) {
                index = ShellLines.endOf(source, index);
                continue;
            }

            const isContinuation = ShellLines.isStandaloneContinuation({
                text: source,
                index,
                markers: FOREIGN_CONTINUATIONS,
            });
            if (word == null && isContinuation) {
                index = ShellLines.endOf(source, index);
                continue;
            }

            if (character === BACKSLASH) {
                const next = source.charAt(index + 1);
                if (next !== ShellLines.LineBreak) {
                    word = `${word ?? ''}${next}`;
                }

                index += 2;
                continue;
            }

            if (character === SINGLE_QUOTE) {
                const close = source.indexOf(SINGLE_QUOTE, index + 1);
                if (close === -1) {
                    return null;
                }

                word = `${word ?? ''}${source.slice(index + 1, close)}`;
                index = close + 1;
                continue;
            }

            const read = quotedTextAt(source, index);
            if (read === null) {
                return null;
            }

            if (read !== undefined) {
                word = `${word ?? ''}${read.value}`;
                index = read.end;
                continue;
            }

            word = `${word ?? ''}${character}`;
            index++;
        }

        if (word != null) {
            words.push(word);
        }

        return words;
    },
};
