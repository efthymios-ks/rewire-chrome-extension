export const CRITERION_OPERATOR_IDS = Object.freeze({
    Wildcard: 'wildcard',
    Regex: 'regex',
    Domains: 'domains',
    OneOf: 'oneOf',
    Exists: 'exists',
    Range: 'range',
    Percent: 'percent',
    Between: 'between',
} as const);
