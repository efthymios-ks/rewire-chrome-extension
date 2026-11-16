import { ShellLines } from './ShellLines';

const CARET = '^';
const DOUBLE_QUOTE = '"';
const BACKSLASH = '\\';
const SPACE = ' ';
const FOREIGN_CONTINUATIONS = [
    '\\',
    '`',
];

function expandCarets(text: string): string {
    let output = '';
    let isQuoted = false;
    let index = 0;
    while (index < text.length) {
        const character = text.charAt(index);
        if (character === DOUBLE_QUOTE) {
            isQuoted = !isQuoted;
            output += character;
            index++;
            continue;
        }

        if (!isQuoted && character === CARET) {
            const escaped = text.charAt(index + 1) === ShellLines.LineBreak ? index + 2 : index + 1;
            output += text.charAt(escaped);
            index = escaped + 1;
            continue;
        }

        const isContinuation = ShellLines.isStandaloneContinuation({
            text,
            index,
            markers: FOREIGN_CONTINUATIONS,
        });
        if (!isQuoted && isContinuation) {
            output += SPACE;
            index = ShellLines.endOf(text, index) + 1;
            continue;
        }

        output += !isQuoted && character === ShellLines.LineBreak ? SPACE : character;
        index++;
    }

    return output;
}

function countBackslashes(text: string, index: number): number {
    let count = 0;
    while (text.charAt(index + count) === BACKSLASH) {
        count++;
    }

    return count;
}

function splitArguments(text: string): string[] {
    const words: string[] = [];
    let word: string | null = null;
    let isQuoted = false;
    let index = 0;
    while (index < text.length) {
        const character = text.charAt(index);
        if (character === BACKSLASH) {
            const count = countBackslashes(text, index);
            const isBeforeQuote = text.charAt(index + count) === DOUBLE_QUOTE;
            const kept = isBeforeQuote ? Math.floor(count / 2) : count;
            const isLiteralQuote = isBeforeQuote && count % 2 === 1;
            word = `${word ?? ''}${BACKSLASH.repeat(kept)}${isLiteralQuote ? DOUBLE_QUOTE : ''}`;
            index += isLiteralQuote ? count + 1 : count;
            continue;
        }

        if (character === DOUBLE_QUOTE) {
            const isEscapedQuote: boolean = isQuoted && text.charAt(index + 1) === DOUBLE_QUOTE;
            word = `${word ?? ''}${isEscapedQuote ? DOUBLE_QUOTE : ''}`;
            isQuoted = isEscapedQuote ? isQuoted : !isQuoted;
            index += isEscapedQuote ? 2 : 1;
            continue;
        }

        if (!isQuoted && ShellLines.isWhitespace(character)) {
            if (word != null) {
                words.push(word);
                word = null;
            }

            index++;
            continue;
        }

        word = `${word ?? ''}${character}`;
        index++;
    }

    if (word != null) {
        words.push(word);
    }

    return words;
}

export const CmdShellWords = {
    split(text: string): string[] {
        return splitArguments(expandCarets(ShellLines.normalize(text)));
    },
};
