const QueryMarker = "?";
const FragmentMarker = "#";
const PairSeparator = "&";
const ValueSeparator = "=";
const PlusPattern = /\+/g;
const Space = " ";

interface UrlPieces {
    base: string;
    pairs: string[];
    fragment: string;
}

function decoded(text: string): string {
    try {
        return decodeURIComponent(text.replace(PlusPattern, Space));
    } catch {
        return text;
    }
}

function keyOf(pair: string): string {
    const separatorIndex = pair.indexOf(ValueSeparator);

    return decoded(separatorIndex === -1 ? pair : pair.slice(0, separatorIndex));
}

function piecesOf(url: string): UrlPieces {
    const fragmentIndex = url.indexOf(FragmentMarker);
    const withoutFragment = fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
    const fragment = fragmentIndex === -1 ? "" : url.slice(fragmentIndex);
    const queryIndex = withoutFragment.indexOf(QueryMarker);
    if (queryIndex === -1) {
        return {
            base: withoutFragment,
            pairs: [],
            fragment,
        };
    }

    return {
        base: withoutFragment.slice(0, queryIndex),
        pairs: withoutFragment
            .slice(queryIndex + 1)
            .split(PairSeparator)
            .filter(pair => pair !== ""),
        fragment,
    };
}

export const QueryString = {
    keysOf(url: string): string[] {
        return [...new Set(piecesOf(url).pairs.map(keyOf))];
    },

    without(url: string, keys: string[]): string {
        if (keys.length === 0) {
            return url;
        }

        const pieces = piecesOf(url);
        const kept = pieces.pairs.filter(pair => !keys.includes(keyOf(pair)));
        const query = kept.length === 0 ? "" : `${QueryMarker}${kept.join(PairSeparator)}`;

        return `${pieces.base}${query}${pieces.fragment}`;
    },
};
