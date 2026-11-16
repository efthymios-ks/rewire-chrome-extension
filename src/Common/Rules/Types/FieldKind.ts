export const FIELD_KIND = Object.freeze({
    Text: 1,
    TextArea: 2,
    Code: 3,
    Number: 4,
    Select: 5,
    Checkbox: 6,
    Status: 7,
    Latency: 8,
    StringList: 9,
    KeyValueList: 10,
    Operations: 11,
    MediaType: 12,
} as const);

export type FieldKind = (typeof FIELD_KIND)[keyof typeof FIELD_KIND];
