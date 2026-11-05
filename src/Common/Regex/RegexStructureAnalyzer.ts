import { Result } from "../Results/Result";
import type { RegexFrame } from "./RegexFrame";
import type { RegexQuantifier } from "./RegexQuantifier";
import type { RegexStructure } from "./RegexStructure";

const RootFrameId = 0;
const LazySuffix = "?";
const BoundedQuantifierPattern = /^\{(\d+)(?:,(\d*))?\}/;
const NamedGroupPrefixes = [
    "(?P<",
    "(?<",
];
const LookbehindPrefixes = [
    "(?<=",
    "(?<!",
];
const SimpleQuantifiers = [
    {
        symbol: "?",
        isOptional: true,
    },
    {
        symbol: "*",
        isOptional: true,
    },
    {
        symbol: "+",
        isOptional: false,
    },
];

interface ScanState {
    pattern: string;
    index: number;
    frames: RegexFrame[];
    stack: RegexFrame[];
    captureGroupCount: number;
}

interface QuantifierArguments {
    pattern: string;
    start: number;
    coreEnd: number;
    isOptional: boolean;
}

type TokenHandler = (state: ScanState) => Result<void>;

function currentFrame(state: ScanState): RegexFrame {
    return state.stack[state.stack.length - 1]!;
}

function buildQuantifier(args: QuantifierArguments): RegexQuantifier {
    const end = args.pattern.charAt(args.coreEnd) === LazySuffix
        ? args.coreEnd + 1
        : args.coreEnd;

    return {
        start: args.start,
        end,
        text: args.pattern.slice(args.start, end),
        isOptional: args.isOptional,
    };
}

function readQuantifier(pattern: string, start: number): RegexQuantifier | null {
    const character = pattern.charAt(start);
    const simple = SimpleQuantifiers.find(quantifier => quantifier.symbol === character);
    if (simple !== undefined) {
        return buildQuantifier({
            pattern,
            start,
            coreEnd: start + 1,
            isOptional: simple.isOptional,
        });
    }

    const bounded = BoundedQuantifierPattern.exec(pattern.slice(start));
    if (bounded === null) {
        return null;
    }

    return buildQuantifier({
        pattern,
        start,
        coreEnd: start + bounded[0].length,
        isOptional: Number(bounded[1]) === 0,
    });
}

function opensCapturingGroup(pattern: string, index: number): boolean {
    if (pattern.charAt(index + 1) !== "?") {
        return true;
    }

    const rest = pattern.slice(index);
    if (LookbehindPrefixes.some(prefix => rest.startsWith(prefix))) {
        return false;
    }

    return NamedGroupPrefixes.some(prefix => rest.startsWith(prefix));
}

function findCharacterClassEnd(pattern: string, start: number): number {
    let index = start + 1;
    if (pattern.charAt(index) === "^") {
        index += 1;
    }

    if (pattern.charAt(index) === "]") {
        index += 1;
    }

    while (index < pattern.length) {
        const character = pattern.charAt(index);
        if (character === "\\") {
            index += 2;
            continue;
        }

        if (character === "]") {
            return index + 1;
        }

        if (character === "[" && pattern.charAt(index + 1) === ":") {
            const posixClassEnd = pattern.indexOf(":]", index + 2);
            index = posixClassEnd === -1 ? index + 1 : posixClassEnd + 2;
            continue;
        }

        index += 1;
    }

    return -1;
}

function skipEscape(state: ScanState): Result<void> {
    state.index += 2;

    return Result.done();
}

function skipCharacterClass(state: ScanState): Result<void> {
    const classEnd = findCharacterClassEnd(state.pattern, state.index);
    if (classEnd === -1) {
        return Result.fail(`Unclosed character class at position ${state.index}.`);
    }

    state.index = classEnd;

    return Result.done();
}

function openGroup(state: ScanState): Result<void> {
    let captureIndex: number | null = null;
    if (opensCapturingGroup(state.pattern, state.index)) {
        state.captureGroupCount += 1;
        captureIndex = state.captureGroupCount;
    }

    const frame: RegexFrame = {
        id: state.frames.length,
        parentId: currentFrame(state).id,
        captureIndex,
        quantifier: null,
        hasAlternation: false,
    };
    state.frames.push(frame);
    state.stack.push(frame);
    state.index += 1;

    return Result.done();
}

function closeGroup(state: ScanState): Result<void> {
    if (state.stack.length === 1) {
        return Result.fail(`Unmatched ")" at position ${state.index}.`);
    }

    const frame = state.stack.pop()!;
    frame.quantifier = readQuantifier(state.pattern, state.index + 1);
    state.index = frame.quantifier?.end ?? state.index + 1;

    return Result.done();
}

function markAlternation(state: ScanState): Result<void> {
    currentFrame(state).hasAlternation = true;
    state.index += 1;

    return Result.done();
}

function advance(state: ScanState): Result<void> {
    state.index += 1;

    return Result.done();
}

const TokenHandlers = new Map<string, TokenHandler>([
    [
        "\\",
        skipEscape,
    ],
    [
        "[",
        skipCharacterClass,
    ],
    [
        "(",
        openGroup,
    ],
    [
        ")",
        closeGroup,
    ],
    [
        "|",
        markAlternation,
    ],
]);

export const RegexStructureAnalyzer = {
    analyze(pattern: string): Result<RegexStructure> {
        const root: RegexFrame = {
            id: RootFrameId,
            parentId: null,
            captureIndex: null,
            quantifier: null,
            hasAlternation: false,
        };
        const state: ScanState = {
            pattern,
            index: 0,
            frames: [root],
            stack: [root],
            captureGroupCount: 0,
        };

        while (state.index < pattern.length) {
            const handler = TokenHandlers.get(pattern.charAt(state.index)) ?? advance;
            const outcome = handler(state);
            if (outcome.hasErrors) {
                return outcome;
            }
        }

        if (state.stack.length > 1) {
            return Result.fail("Unclosed \"(\" in the regex.");
        }

        return Result.ok({
            frames: state.frames,
            captureGroupCount: state.captureGroupCount,
        });
    },
};
