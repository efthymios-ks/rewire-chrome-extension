const SchemeSeparator = "://";
const DefaultScheme = "http://";
const PathSeparatorPattern = /[\\/]/;
const ExecutableSuffix = ".exe";
const QuoteCharacters = [
    "\"",
    "'",
];
const ControlWords = [
    "|",
    "||",
    "&",
    "&&",
    ";",
];
const RedirectionPattern = /^\d?>>?/;

function commandNameOf(word: string): string {
    const name = word
        .split(PathSeparatorPattern)
        .at(-1) ?? word;

    return name
        .toLowerCase()
        .replace(ExecutableSuffix, "");
}

export const RequestLines = {
    commandIndex(words: string[], command: string): number {
        return words.findIndex(word => commandNameOf(word) === command);
    },

    argumentsAfter(words: string[], commandIndex: number): string[] {
        const rest = words.slice(commandIndex + 1);
        const end = rest.findIndex(word => ControlWords.includes(word) || RedirectionPattern.test(word));

        return end === -1 ? rest : rest.slice(0, end);
    },

    withScheme(url: string): string {
        return url.includes(SchemeSeparator) ? url : `${DefaultScheme}${url}`;
    },

    unquote(value: string): string {
        const first = value.charAt(0);
        const isQuoted = value.length >= 2 && QuoteCharacters.includes(first) && value.endsWith(first);

        return isQuoted ? value.slice(1, -1) : value;
    },
};
