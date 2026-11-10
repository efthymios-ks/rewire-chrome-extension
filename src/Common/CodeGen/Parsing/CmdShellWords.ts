import { ShellLines } from "./ShellLines";

const Caret = "^";
const DoubleQuote = "\"";
const Backslash = "\\";
const Space = " ";
const ForeignContinuations = [
    "\\",
    "`",
];

function expandCarets(text: string): string {
    let output = "";
    let isQuoted = false;
    let index = 0;
    while (index < text.length) {
        const character = text.charAt(index);
        if (character === DoubleQuote) {
            isQuoted = !isQuoted;
            output += character;
            index++;
            continue;
        }

        if (!isQuoted && character === Caret) {
            const escaped = text.charAt(index + 1) === ShellLines.LineBreak ? index + 2 : index + 1;
            output += text.charAt(escaped);
            index = escaped + 1;
            continue;
        }

        const isContinuation = ShellLines.isStandaloneContinuation(
            text,
            index,
            ForeignContinuations
        );
        if (!isQuoted && isContinuation) {
            output += Space;
            index = ShellLines.endOf(text, index) + 1;
            continue;
        }

        output += !isQuoted && character === ShellLines.LineBreak ? Space : character;
        index++;
    }

    return output;
}

function countBackslashes(text: string, index: number): number {
    let count = 0;
    while (text.charAt(index + count) === Backslash) {
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
        if (character === Backslash) {
            const count = countBackslashes(text, index);
            const isBeforeQuote = text.charAt(index + count) === DoubleQuote;
            const kept = isBeforeQuote ? Math.floor(count / 2) : count;
            const isLiteralQuote = isBeforeQuote && count % 2 === 1;
            word = `${word ?? ""}${Backslash.repeat(kept)}${isLiteralQuote ? DoubleQuote : ""}`;
            index += isLiteralQuote ? count + 1 : count;
            continue;
        }

        if (character === DoubleQuote) {
            const isEscapedQuote: boolean = isQuoted && text.charAt(index + 1) === DoubleQuote;
            word = `${word ?? ""}${isEscapedQuote ? DoubleQuote : ""}`;
            isQuoted = isEscapedQuote ? isQuoted : !isQuoted;
            index += isEscapedQuote ? 2 : 1;
            continue;
        }

        if (!isQuoted && ShellLines.isWhitespace(character)) {
            if (word !== null) {
                words.push(word);
                word = null;
            }

            index++;
            continue;
        }

        word = `${word ?? ""}${character}`;
        index++;
    }

    if (word !== null) {
        words.push(word);
    }

    return words;
}

export const CmdShellWords = {
    split(text: string): string[] {
        return splitArguments(expandCarets(ShellLines.normalize(text)));
    },
};
