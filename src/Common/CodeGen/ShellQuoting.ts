const SingleQuote = "'";
const PowerShellQuotePattern = /['‘’‚‛]/g;
const CmdUnsafePattern = /[^a-zA-Z0-9\s_\-:=+~'/.,?;()*`]/g;
const CmdVariablePattern = /%(?=[a-zA-Z0-9_])/g;
const LineBreakPattern = /\r?\n/g;
const BackslashesBeforeQuotePattern = /(\\*)"/g;
const TrailingBackslashesPattern = /(\\+)$/;
const NonAsciiPattern = /[^\x00-\x7F]/;
const ControlCharacterPattern = /[\x00-\x08\x0B-\x1F\x7F]/;
const AnsiEscapedPattern = /[\\'\x00-\x1F\x7F]/g;
const HexRadix = 16;
const AnsiEscapes: Record<string, string> = {
    "\\": "\\\\",
    "'": "\\'",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
};

export const ShellQuoting = {
    posix(value: string): string {
        if (ControlCharacterPattern.test(value)) {
            return `$'${value.replace(AnsiEscapedPattern, character => AnsiEscapes[character] ?? `\\x${character.charCodeAt(0).toString(HexRadix).padStart(2, "0")}`)}'`;
        }

        return `${SingleQuote}${value.replaceAll(SingleQuote, "'\\''")}${SingleQuote}`;
    },

    powerShell(value: string): string {
        return `${SingleQuote}${value.replace(PowerShellQuotePattern, match => `${match}${match}`)}${SingleQuote}`;
    },

    cmd(value: string): string {
        const escaped = value
            .replace(BackslashesBeforeQuotePattern, "$1$1\\\"")
            .replace(TrailingBackslashesPattern, "$1$1")
            .replace(CmdUnsafePattern, "^$&")
            .replace(CmdVariablePattern, "%^")
            .replace(LineBreakPattern, "^\n\n");

        return `^"${escaped}^"`;
    },

    hasNonAscii(text: string): boolean {
        return NonAsciiPattern.test(text);
    },
};
