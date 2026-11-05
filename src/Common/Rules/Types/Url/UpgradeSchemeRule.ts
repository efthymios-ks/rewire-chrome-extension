import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { RequestDraft } from "../../Drafts/Drafts";
import { UrlRewrite } from "../../Http/UrlRewrite";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import type { FieldSpec } from "../FieldSpec";
import { RuleTypeBase } from "../RuleTypeBase";

type UpgradeSchemeAction = Record<string, never>;

export class UpgradeSchemeRule extends RuleTypeBase<UpgradeSchemeAction> {
    readonly id = RuleTypeIds.UpgradeScheme;
    readonly category = RuleCategory.UrlAndRedirects;
    readonly label = "HTTP to HTTPS";
    readonly description = "Upgrade http requests to https.";
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [];

    protected defaults(): UpgradeSchemeAction {
        return {};
    }

    protected read(_action: RuleAction): UpgradeSchemeAction {
        return {};
    }

    protected describe(_action: UpgradeSchemeAction): string {
        return "http -> https";
    }

    protected override onRequest(
        draft: RequestDraft,
        _action: UpgradeSchemeAction,
        _context: RuleContext
    ): RequestDraft {
        return {
            ...draft,
            url: UrlRewrite.upgradeScheme(draft.url),
        };
    }

    protected override browserRules(
        _action: UpgradeSchemeAction,
        condition: DnrCondition,
        _context: RuleContext
    ): Result<DnrRuleDraft[]> {
        return Result.ok([
            {
                action: {
                    type: "upgradeScheme",
                },
                condition,
            },
        ]);
    }
}
