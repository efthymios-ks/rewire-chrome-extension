const SINGLE_QUOTE = "'";
const POWERSHELL_QUOTE_PATTERN = /['‘’‚‛]/g;
const CMD_UNSAFE_PATTERN = /[^a-zA-Z0-9\s_\-:=+~'/.,?;()*`]/g;
const CMD_VARIABLE_PATTERN = /%(?=[a-zA-Z0-9_])/g;
const LINE_BREAK_PATTERN = /\r?\n/g;
const BACKSLASHES_BEFORE_QUOTE_PATTERN = /(\\*)"/g;
const TRAILING_BACKSLASHES_PATTERN = /(\\+)$/;
const NON_ASCII_PATTERN = /[^\x00-\x7F]/;
const CONTROL_CHARACTER_PATTERN = /[\x00-\x08\x0B-\x1F\x7F]/;
const ANSI_ESCAPED_PATTERN = /[\\'\x00-\x1F\x7F]/g;
const HEX_RADIX = 16;
const ANSI_ESCAPES: Record<string, string> = Object.freeze({
    '\\': '\\\\',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
});

function hexEscapeOf(character: string): string {
    const hex = character
        .charCodeAt(0)
        .toString(HEX_RADIX)
        .padStart(2, '0');

    return `\\x${hex}`;
}

function ansiEscapeOf(character: string): string {
    return ANSI_ESCAPES[character] ?? hexEscapeOf(character);
}

export const ShellQuoting = {
    posix(value: string): string {
        if (CONTROL_CHARACTER_PATTERN.test(value)) {
            return `$'${value.replace(ANSI_ESCAPED_PATTERN, character => ansiEscapeOf(character))}'`;
        }

        return `${SINGLE_QUOTE}${value.replaceAll(SINGLE_QUOTE, "'\\''")}${SINGLE_QUOTE}`;
    },

    powerShell(value: string): string {
        const escaped = value.replace(POWERSHELL_QUOTE_PATTERN, match => `${match}${match}`);

        return `${SINGLE_QUOTE}${escaped}${SINGLE_QUOTE}`;
    },

    cmd(value: string): string {
        const escaped = value
            .replace(BACKSLASHES_BEFORE_QUOTE_PATTERN, '$1$1\\"')
            .replace(TRAILING_BACKSLASHES_PATTERN, '$1$1')
            .replace(CMD_UNSAFE_PATTERN, '^$&')
            .replace(CMD_VARIABLE_PATTERN, '%^')
            .replace(LINE_BREAK_PATTERN, '^\n\n');

        return `^"${escaped}^"`;
    },

    hasNonAscii(text: string): boolean {
        return NON_ASCII_PATTERN.test(text);
    },
};
