export const RULE_ENGINE = Object.freeze({
    Browser: 1,
    Debugger: 2,
    Both: 3,
    Invalid: 4,
} as const);

export type RuleEngine = (typeof RULE_ENGINE)[keyof typeof RULE_ENGINE];
