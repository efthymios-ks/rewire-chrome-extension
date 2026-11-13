import { RuleCategory } from "../../../Contracts/Rules/RuleCategory";
import { RequestCookieRule } from "./Cookies/RequestCookieRule";
import { ResponseCookieRule } from "./Cookies/ResponseCookieRule";
import { AllowEmbeddingRule } from "./Headers/AllowEmbeddingRule";
import { CorsRule } from "./Headers/CorsRule";
import { RequestHeaderRule } from "./Headers/RequestHeaderRule";
import { ResponseHeaderRule } from "./Headers/ResponseHeaderRule";
import { SecurityHeadersRule } from "./Headers/SecurityHeadersRule";
import type { IRuleType } from "./IRuleType";
import { SetVariableRule } from "./Logic/SetVariableRule";
import { DelayRule } from "./Mocks/DelayRule";
import { MockResponseRule } from "./Mocks/MockResponseRule";
import { RequestBodyRule } from "./Mocks/RequestBodyRule";
import { ResponseBodyRule } from "./Mocks/ResponseBodyRule";
import { QueryParamsRule } from "./Url/QueryParamsRule";
import { RedirectRule } from "./Url/RedirectRule";
import { RewriteRule } from "./Url/RewriteRule";
import { UpgradeSchemeRule } from "./Url/UpgradeSchemeRule";

export interface RuleCategoryGroup {
    category: RuleCategory;
    label: string;
    types: IRuleType[];
}

export const RuleCategoryLabels: Record<RuleCategory, string> = {
    [RuleCategory.Headers]: "Headers",
    [RuleCategory.Cookies]: "Cookies",
    [RuleCategory.UrlAndRedirects]: "URL, query & redirects",
    [RuleCategory.MocksAndResponses]: "Mocks & responses",
    [RuleCategory.Logic]: "Logic",
};

const RuleTypes: IRuleType[] = [
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
    all(): IRuleType[] {
        return RuleTypes;
    },

    get(id: string): IRuleType | undefined {
        return RuleTypes.find(type => type.id === id);
    },

    groups(): RuleCategoryGroup[] {
        return Object
            .values(RuleCategory)
            .filter((category): category is RuleCategory => typeof category === "number")
            .map(category => ({
                category,
                label: RuleCategoryLabels[category],
                types: RuleTypes.filter(type => type.category === category),
            }));
    },
};
