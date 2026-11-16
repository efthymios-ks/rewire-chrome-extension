import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { Result } from '../../../Results/Result';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import { UrlRewrite } from '../../Http/UrlRewrite';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import type { FieldSpec } from '../FieldSpec';
import { type BrowserRulesOptions, type OnRequestOptions, RuleTypeBase } from '../RuleTypeBase';

type UpgradeSchemeAction = Record<string, never>;

export class UpgradeSchemeRule extends RuleTypeBase<UpgradeSchemeAction> {
    readonly id = RULE_TYPE_IDS.UpgradeScheme;
    readonly category = RULE_CATEGORY.UrlAndRedirects;
    readonly label = 'HTTP to HTTPS';
    readonly description = 'Upgrade http requests to https.';
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [];

    protected defaults(): UpgradeSchemeAction {
        return {};
    }

    protected read(_action: RuleAction): UpgradeSchemeAction {
        return {};
    }

    protected describe(_action: UpgradeSchemeAction): string {
        return 'http -> https';
    }

    protected override onRequest({ draft }: OnRequestOptions<UpgradeSchemeAction>): RequestDraft {
        return {
            ...draft,
            url: UrlRewrite.upgradeScheme(draft.url),
        };
    }

    protected override browserRules({
        condition,
    }: BrowserRulesOptions<UpgradeSchemeAction>): Result<DnrRuleDraft[]> {
        return Result.ok([
            {
                action: {
                    type: 'upgradeScheme',
                },
                condition,
            },
        ]);
    }
}
