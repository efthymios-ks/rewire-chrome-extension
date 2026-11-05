type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const JsonMergePatch = {
    apply(target: unknown, patch: unknown): unknown {
        if (!isObject(patch)) {
            return patch;
        }

        const base: JsonObject = isObject(target) ? { ...target } : {};
        Object
            .entries(patch)
            .forEach(([key, value]) => {
                if (value === null) {
                    delete base[key];

                    return;
                }

                base[key] = JsonMergePatch.apply(base[key], value);
            });

        return base;
    },
};
