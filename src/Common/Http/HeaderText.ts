import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";

const LineBreakPattern = /\r?\n/;
const NameSeparator = ":";

function headerOf(line: string): HeaderEntry[] {
    const searchFrom = line.startsWith(NameSeparator) ? NameSeparator.length : 0;
    const index = line.indexOf(NameSeparator, searchFrom);
    const name = index === -1 ? "" : line.slice(0, index).trim();
    if (name.length === 0 || name === NameSeparator) {
        return [];
    }

    return [
        {
            name,
            value: line.slice(index + NameSeparator.length).trim(),
        },
    ];
}

export const HeaderText = {
    parse(text: string): HeaderEntry[] {
        return text
            .split(LineBreakPattern)
            .map(line => line.trim())
            .flatMap(headerOf);
    },
};
