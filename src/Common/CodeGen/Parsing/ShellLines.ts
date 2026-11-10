const WindowsLineBreakPattern = /\r\n?/g;
const LineBreak = "\n";
const InlineSpaces = [
    " ",
    "\t",
];
const ContinuationMarkers = [
    "\\",
    "^",
    "`",
];

export const ShellLines = {
    LineBreak,

    normalize(text: string): string {
        return text.replace(WindowsLineBreakPattern, LineBreak);
    },

    endOf(text: string, index: number): number {
        const end = text.indexOf(LineBreak, index);

        return end === -1 ? text.length : end;
    },

    isWhitespace(character: string): boolean {
        return InlineSpaces.includes(character) || character === LineBreak;
    },

    isStandaloneContinuation(
        text: string,
        index: number,
        markers: string[] = ContinuationMarkers
    ): boolean {
        if (!markers.includes(text.charAt(index))) {
            return false;
        }

        const isAfterWhitespace = index === 0 || ShellLines.isWhitespace(text.charAt(index - 1));
        const rest = text.slice(index + 1, ShellLines.endOf(text, index));

        return isAfterWhitespace && rest.split("").every(character => InlineSpaces.includes(character));
    },
};
