import { ChangeArea, type ValueChange } from "../../Contracts/Rules/ValueChange";
import { HeaderList } from "../Rules/Http/HeaderList";
import { type RequestSnapshot, SnapshotVariant } from "./RequestSnapshot";

export interface SnapshotSource extends RequestSnapshot {
    changes: ValueChange[];
}

type ChangeApplier = (
    snapshot: RequestSnapshot,
    change: ValueChange,
    value: string | null
) => RequestSnapshot;

const ChangeAppliers: Partial<Record<ChangeArea, ChangeApplier>> = {
    [ChangeArea.Url]: (
        snapshot,
        _change,
        value
    ) => ({
        ...snapshot,
        url: value ?? snapshot.url,
    }),
    [ChangeArea.RequestHeader]: (
        snapshot,
        change,
        value
    ) => ({
        ...snapshot,
        headers: value === null
            ? HeaderList.remove(snapshot.headers, change.name)
            : HeaderList.set(
                snapshot.headers,
                change.name,
                value
            ),
    }),
    [ChangeArea.RequestBody]: (
        snapshot,
        _change,
        value
    ) => ({
        ...snapshot,
        body: value,
    }),
};

export const RequestSnapshots = {
    of(source: SnapshotSource, variant: SnapshotVariant): RequestSnapshot {
        const snapshot: RequestSnapshot = {
            method: source.method,
            url: source.url,
            headers: source.headers,
            body: source.body,
        };
        const ordered = variant === SnapshotVariant.Original ? source.changes.toReversed() : source.changes;

        return ordered.reduce(
            (current, change) => {
                const applier = ChangeAppliers[change.area];
                if (applier === undefined) {
                    return current;
                }

                const value = variant === SnapshotVariant.Original ? change.before : change.after;

                return applier(
                    current,
                    change,
                    value
                );
            },
            snapshot
        );
    },

    hasRequestChanges(changes: ValueChange[]): boolean {
        return changes.some(change => ChangeAppliers[change.area] !== undefined);
    },
};
