export const IMPORT_MODE = Object.freeze({
    Merge: 1,
    Replace: 2,
} as const);

export type ImportMode = (typeof IMPORT_MODE)[keyof typeof IMPORT_MODE];
