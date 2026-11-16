export const TESTER_OUTCOME_KIND = Object.freeze({
    Continued: 1,
    Answered: 2,
} as const);

export type TesterOutcomeKind = (typeof TESTER_OUTCOME_KIND)[keyof typeof TESTER_OUTCOME_KIND];
