import { RegexText } from "./RegexText";

const EscapeCharacter = "\\";
const AnySequenceCharacter = "*";
const AnySingleCharacter = "?";
const EscapableCharacterPattern = /[\\*?]/g;
const AnyCharacter = ".";
const EscapedCharacterPattern = /\\(.)/gs;

interface WildcardToken {
    character: string;
    length: number;
    toRegexSource(
        pattern: string,
        index: number,
        anyCharacter: string
    ): string;
}

const WildcardTokens: WildcardToken[] = [
    {
        character: EscapeCharacter,
        length: 2,
        toRegexSource: (pattern, index) => RegexText.escape(pattern.charAt(index + 1)),
    },
    {
        character: AnySequenceCharacter,
        length: 1,
        toRegexSource: (
            _pattern,
            _index,
            anyCharacter
        ) => `${anyCharacter}*`,
    },
    {
        character: AnySingleCharacter,
        length: 1,
        toRegexSource: (
            _pattern,
            _index,
            anyCharacter
        ) => anyCharacter,
    },
];

export const WildcardPattern = {
    toRegExp(pattern: string): RegExp {
        return new RegExp(WildcardPattern.toRegexSource(pattern), "s");
    },

    toRegexSource(pattern: string): string {
        return `^${WildcardPattern.toRegexFragment(pattern)}$`;
    },

    toRegexFragment(pattern: string, anyCharacter: string = AnyCharacter): string {
        let source = "";
        let index = 0;
        while (index < pattern.length) {
            const character = pattern.charAt(index);
            const token = WildcardTokens.find(candidate => candidate.character === character);
            if (token === undefined) {
                source += RegexText.escape(character);
                index += 1;
                continue;
            }

            source += token.toRegexSource(
                pattern,
                index,
                anyCharacter
            );
            index += token.length;
        }

        return source;
    },

    matches(pattern: string, url: string): boolean {
        return WildcardPattern
            .toRegExp(pattern)
            .test(url);
    },

    hasWildcards(pattern: string): boolean {
        let index = 0;
        while (index < pattern.length) {
            const character = pattern.charAt(index);
            if (character === EscapeCharacter) {
                index += 2;
                continue;
            }

            if (character === AnySequenceCharacter || character === AnySingleCharacter) {
                return true;
            }

            index += 1;
        }

        return false;
    },

    unescape(pattern: string): string {
        return pattern.replace(EscapedCharacterPattern, "$1");
    },

    escape(text: string): string {
        return text.replace(EscapableCharacterPattern, match => `${EscapeCharacter}${match}`);
    },
};
