export interface GetOrCreateOptions<TKey, TValue> {
    map: Map<TKey, TValue>;
    key: TKey;
    create: () => TValue;
}

export function getOrCreate<TKey, TValue>({ map, key, create }: GetOrCreateOptions<TKey, TValue>): TValue {
    const existing = map.get(key);
    if (existing != null) {
        return existing;
    }

    const created = create();
    map.set(key, created);

    return created;
}
