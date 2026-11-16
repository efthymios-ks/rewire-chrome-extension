export const CRITERION_STAGE = Object.freeze({
    Request: 1,
    Response: 2,
    Static: 3,
} as const);

export type CriterionStage = (typeof CRITERION_STAGE)[keyof typeof CRITERION_STAGE];
