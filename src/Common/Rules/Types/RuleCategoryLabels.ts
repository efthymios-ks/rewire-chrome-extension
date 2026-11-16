import { RULE_CATEGORY, type RuleCategory } from '../../../Contracts/Rules/RuleCategory';

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = Object.freeze({
    [RULE_CATEGORY.Headers]: 'Headers',
    [RULE_CATEGORY.Cookies]: 'Cookies',
    [RULE_CATEGORY.UrlAndRedirects]: 'URL, query & redirects',
    [RULE_CATEGORY.MocksAndResponses]: 'Mocks & responses',
    [RULE_CATEGORY.Logic]: 'Logic',
});
