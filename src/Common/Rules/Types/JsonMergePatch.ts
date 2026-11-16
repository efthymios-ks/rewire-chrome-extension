import { RawRecords } from '../../Objects/RawRecords';

export const JsonMergePatch = {
    apply(target: unknown, patch: unknown): unknown {
        if (!RawRecords.is(patch)) {
            return patch;
        }

        const base = new Map(Object.entries(RawRecords.is(target) ? target : {}));
        Object
            .entries(patch)
            .forEach(([key, value]) => {
                if (value === null) {
                    base.delete(key);

                    return;
                }

                base.set(key, JsonMergePatch.apply(base.get(key), value));
            });

        return Object.fromEntries(base);
    },
};
