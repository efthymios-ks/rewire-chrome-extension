import { Result } from "../Results/Result";

interface Segment {
    name: string | null;
    index: number | null;
    isDotted: boolean;
}

const RootMarker = "$";
const DotMarker = ".";
const OpenBracket = "[";
const CloseBracket = "]";
const SingleQuote = "'";
const DoubleQuote = "\"";
const LengthProperty = "length";
const IndexPattern = /^-?\d+$/;

function parse(path: string): Result<Segment[]> {
    if (path.length === 0 || path.charAt(0) !== RootMarker) {
        return Result.fail("A JSON path starts with '$'.");
    }

    const segments: Segment[] = [];
    let position = 1;
    while (position < path.length) {
        const character = path.charAt(position);
        if (character === DotMarker) {
            const start = ++position;
            while (position < path.length && path.charAt(position) !== DotMarker && path.charAt(position) !== OpenBracket) {
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

        if (character !== OpenBracket) {
            return Result.fail(`Unexpected '${character}' at position ${position} of '${path}'.`);
        }

        const close = path.indexOf(CloseBracket, position);
        if (close < 0) {
            return Result.fail(`Unclosed '[' at position ${position} of '${path}'.`);
        }

        const inner = path.slice(position + 1, close).trim();
        if (inner.length >= 2 && (inner.charAt(0) === SingleQuote || inner.charAt(0) === DoubleQuote) && inner.charAt(inner.length - 1) === inner.charAt(0)) {
            segments.push({
                name: inner.slice(1, -1),
                index: null,
                isDotted: false,
            });
        } else if (IndexPattern.test(inner)) {
            segments.push({
                name: null,
                index: Number(inner),
                isDotted: false,
            });
        } else {
            return Result.fail(`'[${inner}]' in '${path}' is neither an index nor a quoted name.`);
        }

        position = close + 1;
    }

    return Result.ok(segments);
}

function step(current: unknown, segment: Segment): unknown {
    if (segment.index !== null) {
        if (!Array.isArray(current)) {
            return undefined;
        }

        const position = segment.index < 0 ? current.length + segment.index : segment.index;
        if (position < 0 || position >= current.length) {
            return undefined;
        }

        return current[position];
    }

    const name = segment.name!;
    if (typeof current === "object" && current !== null && !Array.isArray(current) && Object.hasOwn(current, name)) {
        return (current as Record<string, unknown>)[name];
    }

    if (segment.isDotted && name === LengthProperty) {
        if (Array.isArray(current)) {
            return current.length;
        }

        if (typeof current === "string") {
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
