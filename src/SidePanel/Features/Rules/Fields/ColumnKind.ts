export const COLUMN_KIND = Object.freeze({
    Text: 1,
    Number: 2,
    Select: 3,
    Suggested: 4,
} as const);

export type ColumnKind = (typeof COLUMN_KIND)[keyof typeof COLUMN_KIND];
