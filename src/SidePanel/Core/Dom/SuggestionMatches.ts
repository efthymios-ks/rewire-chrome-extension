const MAX_SHOWN = 8;

export const SuggestionMatches = {
    of(source: readonly string[], text: string): string[] {
        const needle = text.trim().toLowerCase();
        const starts = source.filter(value => value.toLowerCase().startsWith(needle));
        const contains = source.filter(
            value => !value.toLowerCase().startsWith(needle) && value.toLowerCase().includes(needle),
        );
        const matches = [
            ...starts,
            ...contains,
        ];
        const isOnlyExact = matches.length === 1 && matches[0]!.toLowerCase() === needle;

        return isOnlyExact ? [] : matches.slice(0, MAX_SHOWN);
    },
};
