export interface MergeByOptions<TItem> {
    current: TItem[];
    incoming: TItem[];
    keyOf: (item: TItem) => string;
    combine?: (current: TItem, incoming: TItem) => TItem;
}

export function mergeBy<TItem>({
    current,
    incoming,
    keyOf,
    combine = (_, match) => match,
}: MergeByOptions<TItem>): TItem[] {
    const currentKeys = new Set(current.map(keyOf));

    return [
        ...current.map(item => {
            const match = incoming.find(candidate => keyOf(candidate) === keyOf(item));

            return match == null ? item : combine(item, match);
        }),
        ...incoming.filter(item => !currentKeys.has(keyOf(item))),
    ];
}
