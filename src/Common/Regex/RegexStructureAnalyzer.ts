import { Result } from '../Results/Result';
import type { RegexFrame } from './RegexFrame';
import type { RegexQuantifier } from './RegexQuantifier';
import type { RegexStructure } from './RegexStructure';

const ROOT_FRAME_ID = 0;
const LAZY_SUFFIX = '?';
const BOUNDED_QUANTIFIER_PATTERN = /^\{(\d+)(?:,(\d*))?\}/;
const NAMED_GROUP_PREFIXES = [
    '(?P<',
    '(?<',
];
const LOOKBEHIND_PREFIXES = [
    '(?<=',
    '(?<!',
];
const SIMPLE_QUANTIFIERS = [
    {
        symbol: '?',
        isOptional: true,
    },
    {
        symbol: '*',
        isOptional: true,
    },
    {
        symbol: '+',
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

interface BuildQuantifierOptions {
    pattern: string;
    start: number;
    coreEnd: number;
    isOptional: boolean;
}

type TokenHandler = (state: ScanState) => Result<void>;

function currentFrame(state: ScanState): RegexFrame {
    return state.stack[state.stack.length - 1]!;
}

function buildQuantifier(args: BuildQuantifierOptions): RegexQuantifier {
    const end = args.pattern.charAt(args.coreEnd) === LAZY_SUFFIX
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
    const simple = SIMPLE_QUANTIFIERS.find(quantifier => quantifier.symbol === character);
    if (simple != null) {
        return buildQuantifier({
            pattern,
            start,
            coreEnd: start + 1,
            isOptional: simple.isOptional,
        });
    }

    const bounded = BOUNDED_QUANTIFIER_PATTERN.exec(pattern.slice(start));
    if (bounded == null) {
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
    if (pattern.charAt(index + 1) !== '?') {
        return true;
    }

    const rest = pattern.slice(index);
    if (LOOKBEHIND_PREFIXES.some(prefix => rest.startsWith(prefix))) {
        return false;
    }

    return NAMED_GROUP_PREFIXES.some(prefix => rest.startsWith(prefix));
}

function findCharacterClassEnd(pattern: string, start: number): number {
    let index = start + 1;
    if (pattern.charAt(index) === '^') {
        index += 1;
    }

    if (pattern.charAt(index) === ']') {
        index += 1;
    }

    while (index < pattern.length) {
        const character = pattern.charAt(index);
        if (character === '\\') {
            index += 2;
            continue;
        }

        if (character === ']') {
            return index + 1;
        }

        if (character === '[' && pattern.charAt(index + 1) === ':') {
            const posixClassEnd = pattern.indexOf(':]', index + 2);
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
    const isCapturing = opensCapturingGroup(state.pattern, state.index);
    if (isCapturing) {
        state.captureGroupCount += 1;
    }

    const captureIndex = isCapturing ? state.captureGroupCount : null;
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
    const frame = state.stack.length > 1 ? state.stack.pop() : undefined;
    if (frame == null) {
        return Result.fail(`Unmatched ")" at position ${state.index}.`);
    }

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

const TOKEN_HANDLERS = new Map<string, TokenHandler>([
    [
        '\\',
        skipEscape,
    ],
    [
        '[',
        skipCharacterClass,
    ],
    [
        '(',
        openGroup,
    ],
    [
        ')',
        closeGroup,
    ],
    [
        '|',
        markAlternation,
    ],
]);

export const RegexStructureAnalyzer = {
    analyze(pattern: string): Result<RegexStructure> {
        const root: RegexFrame = {
            id: ROOT_FRAME_ID,
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
            const handler = TOKEN_HANDLERS.get(pattern.charAt(state.index)) ?? advance;
            const outcome = handler(state);
            if (outcome.hasErrors) {
                return outcome;
            }
        }

        if (state.stack.length > 1) {
            return Result.fail('Unclosed "(" in the regex.');
        }

        return Result.ok({
            frames: state.frames,
            captureGroupCount: state.captureGroupCount,
        });
    },
};
