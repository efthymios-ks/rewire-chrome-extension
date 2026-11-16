export const BODY_MODE = Object.freeze({
    Tree: 1,
    Raw: 2,
} as const);

export type BodyMode = (typeof BODY_MODE)[keyof typeof BODY_MODE];
