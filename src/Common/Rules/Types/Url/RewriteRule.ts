import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import type { RuleCriteria } from '../../../../Contracts/Rules/RuleCriteria';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { Result } from '../../../Results/Result';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import { ActionReader } from '../ActionReader';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { RuleChecks } from '../RuleChecks';
import { type BrowserRulesOptions, type OnRequestOptions, RuleTypeBase } from '../RuleTypeBase';
import { RegexDestination } from './RegexDestination';
import { REGEX_DESTINATION_MESSAGES } from './RegexDestinationMessages';
import { REWRITE_MESSAGES } from './RewriteMessages';

const TARGET_LABEL = 'To URL';

interface RewriteAction {
    target: string;
}

export class RewriteRule extends RuleTypeBase<RewriteAction> {
    readonly id = RULE_TYPE_IDS.Rewrite;
    readonly category = RULE_CATEGORY.UrlAndRedirects;
    readonly label = 'Rewrite';
    readonly description = 'Silently change the URL before the request goes out.';
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Text,
            key: 'target',
            label: TARGET_LABEL,
            placeholder: 'http://localhost:5000/$1',
            hint: '$1 to $9 insert the groups of a URL condition that matches a regex. Can use {{variables}}.',
        },
    ];

    protected defaults(): RewriteAction {
        return {
            target: '',
        };
    }

    protected read(action: RuleAction): RewriteAction {
        return {
            target: ActionReader.text({ raw: action, key: 'target' }),
        };
    }

    protected describe(action: RewriteAction): string {
        return `-> ${action.target}`;
    }

    protected override check(action: RewriteAction, criteria: RuleCriteria): string[] {
        const required = RuleChecks.required(action.target, TARGET_LABEL);

        return required.length > 0 ? required : RegexDestination.groupErrorsOf(action.target, criteria);
    }

    protected override onRequest({
        draft,
        action,
        context,
        criteria,
    }: OnRequestOptions<RewriteAction>): RequestDraft {
        const url = RegexDestination.resolve({
            url: draft.url,
            target: context.render(action.target),
            criteria,
        });
        if (url == null) {
            return draft;
        }

        return {
            ...draft,
            url,
        };
    }

    protected override browserRules({
        action,
        condition,
        context,
        criteria,
    }: BrowserRulesOptions<RewriteAction>): Result<DnrRuleDraft[]> {
        const target = context.render(action.target);
        if (!RegexDestination.usesGroups(target)) {
            return Result.ok([
                {
                    action: {
                        type: 'redirect',
                        redirect: {
                            url: RegexDestination.renderPlain(target),
                        },
                    },
                    condition,
                },
            ]);
        }

        const source = RegexDestination.groupSourceOf(criteria);
        if (source == null) {
            return Result.fail(REGEX_DESTINATION_MESSAGES.GroupsNeedRegex);
        }

        if (condition.regexFilter !== source.value) {
            return Result.fail(REWRITE_MESSAGES.GroupsNeedOwnPattern);
        }

        const compiled = RegexDestination.compile(source.value, target);
        if (compiled.hasErrors) {
            return compiled;
        }

        return Result.ok([
            {
                action: {
                    type: 'redirect',
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
