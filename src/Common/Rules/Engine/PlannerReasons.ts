export const PLANNER_REASONS = Object.freeze({
    UnknownType: 'This rule type is not known; it may come from a later version.',
    ResponseCriteriaTooLate: 'This rule acts before the response, so response conditions can never match it.',
    TypeNeedsDebugger: 'This rule type works on the inspected tab only.',
    RunsInBrowser: 'Works on every tab.',
    RunsOnBoth: 'Works on every tab; CORS preflights are answered on the inspected tab only.',
} as const);
