export const RULE_CATEGORY = Object.freeze({
    Headers: 1,
    Cookies: 2,
    UrlAndRedirects: 3,
    MocksAndResponses: 4,
    Logic: 5,
} as const);

export type RuleCategory = (typeof RULE_CATEGORY)[keyof typeof RULE_CATEGORY];
