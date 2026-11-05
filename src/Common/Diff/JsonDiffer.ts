import { DiffKind } from "./DiffKind";
import type { DiffNode } from "./DiffNode";
import type { DiffSummary } from "./DiffSummary";
import { JsonValueType } from "./JsonValueType";

type JsonRecord = Record<string, unknown>;

interface NodeArguments {
    key: string | null;
    kind: DiffKind;
    before: unknown;
    after: unknown;
}

function valueTypeOf(value: unknown): JsonValueType {
    if (Array.isArray(value)) {
        return JsonValueType.Array;
    }

    if (typeof value === "object" && value !== null) {
        return JsonValueType.Object;
    }

    return JsonValueType.Primitive;
}

function leaf(args: NodeArguments): DiffNode {
    const shownValue = args.kind === DiffKind.Removed
        ? args.before
        : args.after;

    return {
        key: args.key,
        kind: args.kind,
        valueType: valueTypeOf(shownValue),
        before: args.before,
        after: args.after,
        children: [],
    };
}

function container(args: Omit<NodeArguments, "kind">, children: DiffNode[]): DiffNode {
    const isUnchanged = children.every(child => child.kind === DiffKind.Unchanged);

    return {
        key: args.key,
        kind: isUnchanged ? DiffKind.Unchanged : DiffKind.Modified,
        valueType: valueTypeOf(args.after),
        before: args.before,
        after: args.after,
        children,
    };
}

function compareProperty(
    key: string,
    before: JsonRecord,
    after: JsonRecord
): DiffNode {
    if (!Object.hasOwn(after, key)) {
        return leaf({
            key,
            kind: DiffKind.Removed,
            before: before[key],
            after: undefined,
        });
    }

    if (!Object.hasOwn(before, key)) {
        return leaf({
            key,
            kind: DiffKind.Added,
            before: undefined,
            after: after[key],
        });
    }

    return compare(
        key,
        before[key],
        after[key]
    );
}

function compareObjects(before: JsonRecord, after: JsonRecord): DiffNode[] {
    const addedKeys = Object
        .keys(after)
        .filter(key => !Object.hasOwn(before, key));
    const keys = [
        ...Object.keys(before),
        ...addedKeys,
    ];

    return keys.map(key => compareProperty(
        key,
        before,
        after
    ));
}

function compareItem(
    index: number,
    before: unknown[],
    after: unknown[]
): DiffNode {
    const key = `[${index}]`;
    if (index >= after.length) {
        return leaf({
            key,
            kind: DiffKind.Removed,
            before: before[index],
            after: undefined,
        });
    }

    if (index >= before.length) {
        return leaf({
            key,
            kind: DiffKind.Added,
            before: undefined,
            after: after[index],
        });
    }

    return compare(
        key,
        before[index],
        after[index]
    );
}

function compareArrays(before: unknown[], after: unknown[]): DiffNode[] {
    const length = Math.max(before.length, after.length);

    return Array.from(
        { length },
        (_, index) => compareItem(
            index,
            before,
            after
        )
    );
}

function compare(
    key: string | null,
    before: unknown,
    after: unknown
): DiffNode {
    const beforeType = valueTypeOf(before);
    if (beforeType !== valueTypeOf(after)) {
        return leaf({
            key,
            kind: DiffKind.Changed,
            before,
            after,
        });
    }

    switch (beforeType) {
        case JsonValueType.Object:
            return container(
                {
                    key,
                    before,
                    after,
                },
                compareObjects(before as JsonRecord, after as JsonRecord)
            );
        case JsonValueType.Array:
            return container(
                {
                    key,
                    before,
                    after,
                },
                compareArrays(before as unknown[], after as unknown[])
            );
        case JsonValueType.Primitive:
            return leaf({
                key,
                kind: Object.is(before, after) ? DiffKind.Unchanged : DiffKind.Changed,
                before,
                after,
            });
    }
}

function countInto(node: DiffNode, summary: DiffSummary): void {
    switch (node.kind) {
        case DiffKind.Added:
            summary.added += 1;
            return;
        case DiffKind.Removed:
            summary.removed += 1;
            return;
        case DiffKind.Changed:
            summary.changed += 1;
            return;
        default:
            node.children.forEach(child => countInto(child, summary));
    }
}

export const JsonDiffer = {
    diff(before: unknown, after: unknown): DiffNode {
        return compare(
            null,
            before,
            after
        );
    },

    summarize(node: DiffNode): DiffSummary {
        const summary: DiffSummary = {
            added: 0,
            removed: 0,
            changed: 0,
        };
        countInto(node, summary);

        return summary;
    },
};
