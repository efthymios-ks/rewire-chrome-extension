const SCHEME_SEPARATOR = '://';
const DEFAULT_SCHEME = 'http://';
const PATH_SEPARATOR_PATTERN = /[\\/]/;
const EXECUTABLE_SUFFIX = '.exe';
const QUOTE_CHARACTERS = [
    '"',
    "'",
];
const CONTROL_WORDS = [
    '|',
    '||',
    '&',
    '&&',
    ';',
];
const REDIRECTION_PATTERN = /^\d?>>?/;

function commandNameOf(word: string): string {
    const name = word
        .split(PATH_SEPARATOR_PATTERN)
        .at(-1) ?? word;

    return name
        .toLowerCase()
        .replace(EXECUTABLE_SUFFIX, '');
}

export const RequestLines = {
    commandIndex(words: string[], command: string): number {
        return words.findIndex(word => commandNameOf(word) === command);
    },

    argumentsAfter(words: string[], commandIndex: number): string[] {
        const rest = words.slice(commandIndex + 1);
        const end = rest.findIndex(word => CONTROL_WORDS.includes(word) || REDIRECTION_PATTERN.test(word));

        return end === -1 ? rest : rest.slice(0, end);
    },

    withScheme(url: string): string {
        return url.includes(SCHEME_SEPARATOR) ? url : `${DEFAULT_SCHEME}${url}`;
    },

    unquote(value: string): string {
        const first = value.charAt(0);
        const isQuoted = value.length >= 2
            && QUOTE_CHARACTERS.includes(first)
            && value.endsWith(first);

        return isQuoted ? value.slice(1, -1) : value;
    },
};
