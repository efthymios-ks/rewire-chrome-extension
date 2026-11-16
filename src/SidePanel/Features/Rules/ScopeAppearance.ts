import { RULE_ENGINE, type RuleEngine } from '../../../Contracts/Rules/RuleEngine';

export interface ScopeAppearance {
    label: string;
    className: string;
}

export const SCOPE_APPEARANCES: Record<RuleEngine, ScopeAppearance> = {
    [RULE_ENGINE.Browser]: {
        label: 'All tabs',
        className: 'scope-browser',
    },
    [RULE_ENGINE.Debugger]: {
        label: 'Inspected tab',
        className: 'scope-debugger',
    },
    [RULE_ENGINE.Both]: {
        label: 'All tabs',
        className: 'scope-both',
    },
    [RULE_ENGINE.Invalid]: {
        label: 'Invalid',
        className: 'scope-invalid',
    },
};
