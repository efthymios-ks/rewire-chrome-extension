import { RegexText } from './RegexText';

const PARSE_BASE = 'https://query.invalid/';
const PROBE_NAME = 'probe';
const QUERY_MARKER = '?';
const PAIR_MARKER = '=';

type QueryEncoder = (text: string) => string;
type QueryDecoder = (encoded: string) => string | null;

// A query character reaches the network through the URL serializer, form encoding or encodeURIComponent.
const QUERY_ENCODERS: QueryEncoder[] = [
    text => {
        const url = new URL(PARSE_BASE);
        url.search = `${QUERY_MARKER}${text}`;

        return url.search.slice(QUERY_MARKER.length);
    },
    text => new URLSearchParams([[PROBE_NAME, text]])
        .toString()
        .slice(`${PROBE_NAME}${PAIR_MARKER}`.length),
    encodeURIComponent,
];

const NAME_DECODER: QueryDecoder = encoded => {
    const [name] = new URLSearchParams(`${encoded}${PAIR_MARKER}`).keys();

    return name ?? null;
};

const VALUE_DECODER: QueryDecoder = encoded => {
    const params = new URLSearchParams(`${PROBE_NAME}${PAIR_MARKER}${encoded}`);

    return params.get(PROBE_NAME);
};

function encodedOrNull(encode: QueryEncoder, character: string): string | null {
    try {
        return encode(character);
    } catch {
        return null;
    }
}

function encodingsOf(character: string, decode: QueryDecoder): string[] {
    const encodings = QUERY_ENCODERS
        .map(encode => encodedOrNull(encode, character))
        .filter((encoded): encoded is string => encoded != null && decode(encoded) === character);

    return [...new Set(encodings)];
}

function sourceOf(text: string, decode: QueryDecoder): string {
    return [...text]
        .map(character => {
            const encodings = encodingsOf(character, decode).map(encoded => RegexText.escape(encoded));
            if (encodings.length === 0) {
                return RegexText.escape(character);
            }

            return encodings.length === 1 ? encodings[0]! : `(?:${encodings.join('|')})`;
        })
        .join('');
}

export const QueryPattern = {
    nameSource(name: string): string {
        return sourceOf(name, NAME_DECODER);
    },

    valueSource(value: string): string {
        return sourceOf(value, VALUE_DECODER);
    },
};
