import { RegexText } from './RegexText';

const ESCAPE_CHARACTER = '\\';
const ANY_SEQUENCE_CHARACTER = '*';
const ANY_SINGLE_CHARACTER = '?';
const ESCAPABLE_CHARACTER_PATTERN = /[\\*?]/g;
const ANY_CHARACTER = '.';
const ESCAPED_CHARACTER_PATTERN = /\\(.)/gs;
const DOT_ALL_FLAG = 's';
const IGNORE_CASE_FLAG = 'i';

interface ToRegexSourceOptions {
    pattern: string;
    index: number;
    anyCharacter: string;
}

interface WildcardToken {
    character: string;
    length: number;
    toRegexSource(options: ToRegexSourceOptions): string;
}

const WILDCARD_TOKENS: WildcardToken[] = [
    {
        character: ESCAPE_CHARACTER,
        length: 2,
        toRegexSource: ({ pattern, index }) => RegexText.escape(pattern.charAt(index + 1)),
    },
    {
        character: ANY_SEQUENCE_CHARACTER,
        length: 1,
        toRegexSource: ({ anyCharacter }) => `${anyCharacter}*`,
    },
    {
        character: ANY_SINGLE_CHARACTER,
        length: 1,
        toRegexSource: ({ anyCharacter }) => anyCharacter,
    },
];

export const WildcardPattern = {
    toRegExp(pattern: string): RegExp {
        return new RegExp(
            /* pattern: */ WildcardPattern.toRegexSource(pattern),
            /* flags: */ DOT_ALL_FLAG,
        );
    },

    toRegexSource(pattern: string): string {
        return `^${WildcardPattern.toRegexFragment(pattern)}$`;
    },

    toRegexFragment(pattern: string, anyCharacter: string = ANY_CHARACTER): string {
        let source = '';
        let index = 0;
        while (index < pattern.length) {
            const character = pattern.charAt(index);
            const token = WILDCARD_TOKENS.find(candidate => candidate.character === character);
            if (token == null) {
                source += RegexText.escape(character);
                index += 1;
                continue;
            }

            source += token.toRegexSource({ pattern, index, anyCharacter });
            index += token.length;
        }

        return source;
    },

    matches(pattern: string, url: string): boolean {
        return WildcardPattern
            .toRegExp(pattern)
            .test(url);
    },

    matchesIgnoringCase(pattern: string, text: string): boolean {
        return new RegExp(
            /* pattern: */ WildcardPattern.toRegexSource(pattern),
            /* flags: */ `${DOT_ALL_FLAG}${IGNORE_CASE_FLAG}`,
        ).test(text);
    },

    hasWildcards(pattern: string): boolean {
        let index = 0;
        while (index < pattern.length) {
            const character = pattern.charAt(index);
            if (character === ESCAPE_CHARACTER) {
                index += 2;
                continue;
            }

            if (character === ANY_SEQUENCE_CHARACTER || character === ANY_SINGLE_CHARACTER) {
                return true;
            }

            index += 1;
        }

        return false;
    },

    unescape(pattern: string): string {
        return pattern.replace(ESCAPED_CHARACTER_PATTERN, '$1');
    },

    escape(text: string): string {
        return text.replace(ESCAPABLE_CHARACTER_PATTERN, match => `${ESCAPE_CHARACTER}${match}`);
    },
};
