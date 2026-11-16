export const DNR_FRAGMENT_KIND = Object.freeze({
    Condition: 1,
    Regex: 2,
    Unsupported: 3,
} as const);

export type DnrFragmentKind = (typeof DNR_FRAGMENT_KIND)[keyof typeof DNR_FRAGMENT_KIND];
