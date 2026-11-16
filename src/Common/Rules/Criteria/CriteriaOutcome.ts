export const CRITERIA_OUTCOME = Object.freeze({
    Matched: 1,
    NotMatched: 2,
    Deferred: 3,
} as const);

export type CriteriaOutcome = (typeof CRITERIA_OUTCOME)[keyof typeof CRITERIA_OUTCOME];
