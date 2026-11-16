import { RULE_CATEGORY, type RuleCategory } from '../../../Contracts/Rules/RuleCategory';
import { RequestCookieRule } from './Cookies/RequestCookieRule';
import { ResponseCookieRule } from './Cookies/ResponseCookieRule';
import { AllowEmbeddingRule } from './Headers/AllowEmbeddingRule';
import { CorsRule } from './Headers/CorsRule';
import { RequestHeaderRule } from './Headers/RequestHeaderRule';
import { ResponseHeaderRule } from './Headers/ResponseHeaderRule';
import { SecurityHeadersRule } from './Headers/SecurityHeadersRule';
import { RULE_CATEGORY_LABELS } from './RuleCategoryLabels';
import type { RuleType } from './RuleType';
import { SetVariableRule } from './Logic/SetVariableRule';
import { DelayRule } from './Mocks/DelayRule';
import { MockResponseRule } from './Mocks/MockResponseRule';
import { RequestBodyRule } from './Mocks/RequestBodyRule';
import { ResponseBodyRule } from './Mocks/ResponseBodyRule';
import { QueryParamsRule } from './Url/QueryParamsRule';
import { RedirectRule } from './Url/RedirectRule';
import { RewriteRule } from './Url/RewriteRule';
import { UpgradeSchemeRule } from './Url/UpgradeSchemeRule';

export interface RuleCategoryGroup {
    category: RuleCategory;
    label: string;
    types: RuleType[];
}

const RULE_TYPES: RuleType[] = [
    new RequestHeaderRule(),
    new ResponseHeaderRule(),
    new CorsRule(),
    new SecurityHeadersRule(),
    new AllowEmbeddingRule(),
    new RequestCookieRule(),
    new ResponseCookieRule(),
    new RedirectRule(),
    new RewriteRule(),
    new QueryParamsRule(),
    new UpgradeSchemeRule(),
    new MockResponseRule(),
    new DelayRule(),
    new RequestBodyRule(),
    new ResponseBodyRule(),
    new SetVariableRule(),
];

export const RuleTypeRegistry = {
    get(id: string): RuleType | undefined {
        return RULE_TYPES.find(type => type.id === id);
    },

    groups(): RuleCategoryGroup[] {
        return Object
            .values(RULE_CATEGORY)
            .map(category => ({
                category,
                label: RULE_CATEGORY_LABELS[category],
                types: RULE_TYPES.filter(type => type.category === category),
            }));
    },
};
