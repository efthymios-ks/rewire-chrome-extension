export const OwnEntry = {
    of<TValue>(table: Readonly<Record<string, TValue>>, key: string): TValue | undefined {
        return Object.hasOwn(table, key) ? table[key] : undefined;
    },
};
