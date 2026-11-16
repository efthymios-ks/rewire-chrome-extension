function freezeAll(value: unknown, seen: WeakSet<object>): void {
    if (
        typeof value !== 'object'
        || value == null
        || seen.has(value)
    ) {
        return;
    }

    seen.add(value);
    Object.values(value).forEach(child => freezeAll(child, seen));
    Object.freeze(value);
}

export function deepFreeze<TValue>(value: TValue): TValue {
    freezeAll(value, new WeakSet());

    return value;
}
