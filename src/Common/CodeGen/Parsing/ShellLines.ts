const WINDOWS_LINE_BREAK_PATTERN = /\r\n?/g;
const LINE_BREAK = '\n';
const INLINE_SPACES = [
    ' ',
    '\t',
];

export interface IsStandaloneContinuationOptions {
    text: string;
    index: number;
    markers: string[];
}

export const ShellLines = {
    LineBreak: LINE_BREAK,

    normalize(text: string): string {
        return text.replace(WINDOWS_LINE_BREAK_PATTERN, LINE_BREAK);
    },

    endOf(text: string, index: number): number {
        const end = text.indexOf(LINE_BREAK, index);

        return end === -1 ? text.length : end;
    },

    isWhitespace(character: string): boolean {
        return INLINE_SPACES.includes(character) || character === LINE_BREAK;
    },

    isStandaloneContinuation({ text, index, markers }: IsStandaloneContinuationOptions): boolean {
        if (!markers.includes(text.charAt(index))) {
            return false;
        }

        const isAfterWhitespace = index === 0 || ShellLines.isWhitespace(text.charAt(index - 1));
        const rest = text.slice(
            /* start: */ index + 1,
            /* end: */ ShellLines.endOf(text, index),
        );

        return isAfterWhitespace && rest.split('').every(character => INLINE_SPACES.includes(character));
    },
};
