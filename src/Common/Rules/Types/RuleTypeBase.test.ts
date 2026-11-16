import { describe, expect, test } from 'vitest';
import { Result } from '../../Results/Result';
import type { RequestDraft } from '../Drafts/RequestDraft';
import type { ResponseDraft } from '../Drafts/ResponseDraft';
import { ActionReader } from './ActionReader';
import type { DnrRuleDraft } from './DnrRuleDraft';
import type { FieldSpec } from './FieldSpec';
import {
    type BrowserRulesOptions,
    type OnRequestOptions,
    type OnResponseOptions,
    RuleTypeBase,
} from './RuleTypeBase';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../Contracts/Rules/RuleCategory';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext } from '../../../TestData';

interface TagAction {
    tag: string;
}

const CONDITION = {
    urlFilter: '||api.example.com',
};

const SOME_CRITERIA: RuleCriteria = {
    match: CRITERIA_MATCHES.All,
    items: [aCriterion()],
};

class MinimalRule extends RuleTypeBase<TagAction> {
    readonly id = 'minimal';
    readonly category = RULE_CATEGORY.Logic;
    readonly label = 'Minimal';
    readonly description = 'Does nothing by itself.';
    readonly fields: FieldSpec[] = [];

    protected defaults(): TagAction {
        return {
            tag: 'default',
        };
    }

    protected read(action: RuleAction): TagAction {
        return {
            tag: ActionReader.text({ raw: action, key: 'tag', fallback: 'default' }).trim(),
        };
    }

    protected describe(action: TagAction): string {
        return `Tag ${action.tag}`;
    }
}

class TaggingRule extends MinimalRule {
    override readonly handlesRequest = true;
    override readonly handlesResponse = true;
    readonly seenCriteria: RuleCriteria[] = [];

    protected override check(action: TagAction, criteria: RuleCriteria): string[] {
        this.seenCriteria.push(criteria);

        return action.tag === '' ? ['Tag is required.'] : [];
    }

    protected override onRequest({ draft, action }: OnRequestOptions<TagAction>): RequestDraft {
        return {
            ...draft,
            url: `${draft.url}#${action.tag}`,
        };
    }

    protected override onResponse({ draft, action, request }: OnResponseOptions<TagAction>): ResponseDraft {
        return {
            ...draft,
            body: `${action.tag}:${request.method}`,
        };
    }

    protected override browserRules({
        action,
        condition,
        criteria,
    }: BrowserRulesOptions<TagAction>): Result<DnrRuleDraft[]> | null {
        if (criteria.items.length === 0) {
            return Result.fail(`No criteria for ${action.tag}.`);
        }

        return Result.ok([
            {
                action: {
                    type: 'block',
                },
                condition,
            },
        ]);
    }
}

describe('RuleTypeBase', () => {
    test('defaultAction_WhenCalled_ShouldReturnACopyOfTheDefaults', () => {
        // Arrange
        const ruleType = new MinimalRule();
        const first = ruleType.defaultAction();

        // Act
        first['tag'] = 'changed';
        const second = ruleType.defaultAction();

        // Assert
        expect(second).toEqual({
            tag: 'default',
        });
    });

    test('flags_WhenNotOverridden_ShouldAllBeOff', () => {
        // Arrange
        const ruleType = new MinimalRule();

        // Act
        const flags = [
            ruleType.handlesRequest,
            ruleType.handlesResponse,
            ruleType.needsResponseBody,
            ruleType.runsOnBothEngines,
        ];

        // Assert
        expect(flags).toEqual([
            false,
            false,
            false,
            false,
        ]);
    });

    test('validate_WhenCheckIsNotOverridden_ShouldReturnNoErrors', () => {
        // Arrange
        const ruleType = new MinimalRule();

        // Act
        const errors = ruleType.validate({
            tag: 42,
        });

        // Assert
        expect(errors).toEqual([]);
    });

    test('validate_WhenCheckIsOverridden_ShouldCheckTheReadAction', () => {
        // Arrange
        const ruleType = new TaggingRule();

        // Act
        const errors = ruleType.validate({
            tag: '   ',
        });

        // Assert
        expect(errors).toEqual(['Tag is required.']);
    });

    test('validate_WhenCriteriaAreOmitted_ShouldCheckAgainstEmptyCriteria', () => {
        // Arrange
        const ruleType = new TaggingRule();

        // Act
        ruleType.validate({
            tag: 'a',
        });
        ruleType.validate(
            /* action: */ {
                tag: 'a',
            },
            /* criteria: */ SOME_CRITERIA,
        );

        // Assert
        expect(ruleType.seenCriteria).toEqual([
            {
                match: CRITERIA_MATCHES.All,
                items: [],
            },
            SOME_CRITERIA,
        ]);
    });

    test.each([
        [
            {
                tag: '  beta  ',
            },
            'Tag beta',
        ],
        [
            {},
            'Tag default',
        ],
        [
            {
                tag: null,
            },
            'Tag default',
        ],
    ])('summary_WhenActionIs(%j)_ShouldDescribeTheReadAction(%s)', (action, expected) => {
        // Arrange
        const ruleType = new MinimalRule();

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe(expected);
    });

    test('delayOf_WhenNotOverridden_ShouldBeZero', () => {
        // Arrange
        const ruleType = new MinimalRule();

        // Act
        const delay = ruleType.delayOf({
            delayMs: 500,
        });

        // Assert
        expect(delay).toBe(0);
    });

    test.each([
        [
            new MinimalRule(),
            false,
        ],
        [
            new TaggingRule(),
            true,
        ],
    ])('runsAtRequestAndResponse_WhenTypeIs(%s)_ShouldFollowItsFlags(%s)', (ruleType, expected) => {
        // Act
        const stages = [
            ruleType.runsAtRequest({}),
            ruleType.runsAtResponse(
                /* action: */ {},
                /* criteria: */ SOME_CRITERIA,
            ),
        ];

        // Assert
        expect(stages).toEqual([
            expected,
            expected,
        ]);
    });

    test('withoutSecrets_WhenNotOverridden_ShouldReturnTheSameAction', () => {
        // Arrange
        const ruleType = new MinimalRule();
        const action = {
            tag: 'secret',
        };

        // Act
        const cleaned = ruleType.withoutSecrets(action);

        // Assert
        expect(cleaned).toBe(action);
    });

    test('applyRequest_WhenNotOverridden_ShouldReturnTheSameDraft', () => {
        // Arrange
        const ruleType = new MinimalRule();
        const draft = aRequestDraft();

        // Act
        const applied = ruleType.applyRequest({
            draft,
            action: {},
            context: aRuleContext(),
        });

        // Assert
        expect(applied).toBe(draft);
    });

    test('applyRequest_WhenOverridden_ShouldPassTheReadAction', () => {
        // Arrange
        const ruleType = new TaggingRule();
        const draft = aRequestDraft({
            url: 'https://api.example.com/users',
        });

        // Act
        const applied = ruleType.applyRequest({
            draft,
            action: {
                tag: ' v2 ',
            },
            context: aRuleContext(),
            criteria: SOME_CRITERIA,
        });

        // Assert
        expect(applied.url).toBe('https://api.example.com/users#v2');
    });

    test('applyResponse_WhenNotOverridden_ShouldReturnTheSameDraft', () => {
        // Arrange
        const ruleType = new MinimalRule();
        const draft = aResponseDraft();

        // Act
        const applied = ruleType.applyResponse({
            draft,
            action: {},
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(applied).toBe(draft);
    });

    test('applyResponse_WhenOverridden_ShouldPassTheReadActionAndRequest', () => {
        // Arrange
        const ruleType = new TaggingRule();

        // Act
        const applied = ruleType.applyResponse({
            draft: aResponseDraft(),
            action: {},
            context: aRuleContext(),
            request: aRequestDraft({
                method: 'PATCH',
            }),
        });

        // Assert
        expect(applied.body).toBe('default:PATCH');
    });

    test('toDnr_WhenNotOverridden_ShouldReturnNull', () => {
        // Arrange
        const ruleType = new MinimalRule();

        // Act
        const rules = ruleType.toDnr({
            action: {},
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(rules).toBeNull();
    });

    test('toDnr_WhenCriteriaAreOmitted_ShouldPassEmptyCriteria', () => {
        // Arrange
        const ruleType = new TaggingRule();

        // Act
        const rules = ruleType.toDnr({
            action: {
                tag: 'x',
            },
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: true,
            error: 'No criteria for x.',
        });
    });

    test('toDnr_WhenOverriddenAndCriteriaAreGiven_ShouldPassTheCondition', () => {
        // Arrange
        const ruleType = new TaggingRule();

        // Act
        const rules = ruleType.toDnr({
            action: {},
            condition: CONDITION,
            context: aRuleContext(),
            criteria: SOME_CRITERIA,
        });

        // Assert
        expect(rules).toEqual({
            hasErrors: false,
            value: [
                {
                    action: {
                        type: 'block',
                    },
                    condition: CONDITION,
                },
            ],
        });
    });
});
