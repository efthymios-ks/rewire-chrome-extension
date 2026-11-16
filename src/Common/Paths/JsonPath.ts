import { Result } from '../Results/Result';

interface Segment {
    name: string | null;
    index: number | null;
    isDotted: boolean;
}

const ROOT_MARKER = '$';
const DOT_MARKER = '.';
const OPEN_BRACKET = '[';
const CLOSE_BRACKET = ']';
const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const LENGTH_PROPERTY = 'length';
const INDEX_PATTERN = /^-?\d+$/;

function isQuotedName(inner: string): boolean {
    const quote = inner.charAt(0);

    return inner.length >= 2
        && (quote === SINGLE_QUOTE || quote === DOUBLE_QUOTE)
        && inner.charAt(inner.length - 1) === quote;
}

function bracketSegmentOf(inner: string, path: string): Result<Segment> {
    if (isQuotedName(inner)) {
        return Result.ok({
            name: inner.slice(1, -1),
            index: null,
            isDotted: false,
        });
    }

    if (INDEX_PATTERN.test(inner)) {
        return Result.ok({
            name: null,
            index: Number(inner),
            isDotted: false,
        });
    }

    return Result.fail(`'[${inner}]' in '${path}' is neither an index nor a quoted name.`);
}

function parse(path: string): Result<Segment[]> {
    if (path.length === 0 || path.charAt(0) !== ROOT_MARKER) {
        return Result.fail("A JSON path starts with '$'.");
    }

    const segments: Segment[] = [];
    let position = 1;
    while (position < path.length) {
        const character = path.charAt(position);
        if (character === DOT_MARKER) {
            const start = ++position;
            while (
                position < path.length
                && path.charAt(position) !== DOT_MARKER
                && path.charAt(position) !== OPEN_BRACKET
            ) {
                position++;
            }

            if (position === start) {
                return Result.fail(`Empty property name at position ${start} of '${path}'.`);
            }

            segments.push({
                name: path.slice(start, position),
                index: null,
                isDotted: true,
            });
            continue;
        }

        if (character !== OPEN_BRACKET) {
            return Result.fail(`Unexpected '${character}' at position ${position} of '${path}'.`);
        }

        const close = path.indexOf(CLOSE_BRACKET, position);
        if (close < 0) {
            return Result.fail(`Unclosed '[' at position ${position} of '${path}'.`);
        }

        const segment = bracketSegmentOf(
            /* inner: */ path.slice(position + 1, close).trim(),
            /* path: */ path,
        );
        if (segment.hasErrors) {
            return segment;
        }

        segments.push(segment.value);
        position = close + 1;
    }

    return Result.ok(segments);
}

function step(current: unknown, segment: Segment): unknown {
    if (segment.index != null) {
        if (!Array.isArray(current)) {
            return undefined;
        }

        const position = segment.index < 0 ? current.length + segment.index : segment.index;
        if (position < 0 || position >= current.length) {
            return undefined;
        }

        return current[position];
    }

    const { name } = segment;
    if (name == null) {
        return undefined;
    }

    if (
        typeof current === 'object'
        && current != null
        && !Array.isArray(current)
        && Object.hasOwn(current, name)
    ) {
        return (current as Record<string, unknown>)[name];
    }

    if (segment.isDotted && name === LENGTH_PROPERTY) {
        if (Array.isArray(current)) {
            return current.length;
        }

        if (typeof current === 'string') {
            return current.length;
        }
    }

    return undefined;
}

export const JsonPath = {
    validate(path: string): Result<void> {
        const parsed = parse(path);

        return parsed.hasErrors ? parsed : Result.done();
    },

    select(root: unknown, path: string): Result<unknown> {
        const parsed = parse(path);
        if (parsed.hasErrors) {
            return parsed;
        }

        let current: unknown = root;
        for (const segment of parsed.value) {
            current = step(current, segment);
            if (current === undefined) {
                return Result.ok(undefined);
            }
        }

        return Result.ok(current);
    },
};
