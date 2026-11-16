import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';

const LINE_BREAK_PATTERN = /\r?\n/;
const NAME_SEPARATOR = ':';

function headerOf(line: string): HeaderEntry[] {
    const searchFrom = line.startsWith(NAME_SEPARATOR) ? NAME_SEPARATOR.length : 0;
    const index = line.indexOf(NAME_SEPARATOR, searchFrom);
    const name = index === -1 ? '' : line.slice(0, index).trim();
    if (name.length === 0 || name === NAME_SEPARATOR) {
        return [];
    }

    return [
        {
            name,
            value: line.slice(index + NAME_SEPARATOR.length).trim(),
        },
    ];
}

export const HeaderText = {
    parse(text: string): HeaderEntry[] {
        return text
            .split(LINE_BREAK_PATTERN)
            .map(line => line.trim())
            .flatMap(headerOf);
    },
};
