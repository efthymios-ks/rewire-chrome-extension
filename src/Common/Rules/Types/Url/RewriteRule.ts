import type { RuleCriteria } from "../../../../Contracts/Rules/Criterion";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { RequestDraft } from "../../Drafts/Drafts";
import { ActionReader } from "../ActionReader";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { RuleChecks } from "../RuleChecks";
import { RuleTypeBase } from "../RuleTypeBase";
import { RegexDestination, RegexDestinationMessages } from "./RegexDestination";

export const RewriteMessages = {
    GroupsNeedOwnPattern: "$1 to $9 come from the URL regex condition, so with another URL, path, extension, host pattern or query condition the rewrite works on the inspected tab only.",
} as const;

const TargetLabel = "To URL";

interface RewriteAction {
    target: string;
}

export class RewriteRule extends RuleTypeBase<RewriteAction> {
    readonly id = RuleTypeIds.Rewrite;
    readonly category = RuleCategory.UrlAndRedirects;
    readonly label = "Rewrite";
    readonly description = "Silently change the URL before the request goes out.";
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Text,
            key: "target",
            label: TargetLabel,
            placeholder: "http://localhost:5000/users/$1",
            hint: "$1 to $9 insert the groups of a URL condition that matches a regex. Can use {{variables}}.",
        },
    ];

    protected defaults(): RewriteAction {
        return {
            target: "",
        };
    }

    protected read(action: RuleAction): RewriteAction {
        return {
            target: ActionReader.text(action, "target"),
        };
    }

    protected describe(action: RewriteAction): string {
        return `-> ${action.target}`;
    }

    protected override check(action: RewriteAction, criteria: RuleCriteria): string[] {
        const required = RuleChecks.required(action.target, TargetLabel);

        return required.length > 0 ? required : RegexDestination.groupErrorsOf(action.target, criteria);
    }

    protected override onRequest(
        draft: RequestDraft,
        action: RewriteAction,
        context: RuleContext,
        criteria: RuleCriteria
    ): RequestDraft {
        const url = RegexDestination.resolve(
            draft.url,
            context.render(action.target),
            criteria
        );
        if (url === null) {
            return draft;
        }

        return {
            ...draft,
            url,
        };
    }

    protected override browserRules(
        action: RewriteAction,
        condition: DnrCondition,
        context: RuleContext,
        criteria: RuleCriteria
    ): Result<DnrRuleDraft[]> {
        const target = context.render(action.target);
        if (!RegexDestination.usesGroups(target)) {
            return Result.ok([
                {
                    action: {
                        type: "redirect",
                        redirect: {
                            url: RegexDestination.renderPlain(target),
                        },
                    },
                    condition,
                },
            ]);
        }

        const source = RegexDestination.groupSourceOf(criteria);
        if (source === null) {
            return Result.fail(RegexDestinationMessages.GroupsNeedRegex);
        }

        if (condition.regexFilter !== source.value) {
            return Result.fail(RewriteMessages.GroupsNeedOwnPattern);
        }

        const compiled = RegexDestination.compile(source.value, target);
        if (compiled.hasErrors) {
            return compiled;
        }

        return Result.ok([
            {
                action: {
                    type: "redirect",
                    redirect: {
                        regexSubstitution: compiled.value.regexSubstitution,
                    },
                },
                condition: {
                    ...condition,
                    regexFilter: compiled.value.regexFilter,
                },
            },
        ]);
    }
}
