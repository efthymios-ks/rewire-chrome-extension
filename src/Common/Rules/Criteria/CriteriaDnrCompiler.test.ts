import { describe, expect, test } from 'vitest';
import { CriteriaDnrCompiler } from './CriteriaDnrCompiler';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import { FixedRuleContext } from '../../../FixedRuleContext';
import { aCriterion, aRuleContext, criteriaOf } from '../../../TestData';

const OFFICE_HOURS = aCriterion({
    field: CRITERION_FIELD_IDS.TimeWindow,
    op: CRITERION_OPERATOR_IDS.Between,
    value: '09:00-17:00',
});

const EVENING = aCriterion({
    field: CRITERION_FIELD_IDS.TimeWindow,
    op: CRITERION_OPERATOR_IDS.Between,
    value: '18:00-22:00',
});

const USERS_PATH = aCriterion({
    field: CRITERION_FIELD_IDS.Path,
    op: CRITERION_OPERATOR_IDS.Wildcard,
    value: '/api/v1/users',
});

const NEVER_MATCHES_MESSAGE = 'These conditions can never match the same request, so the rule never applies.';

function contextAt(time: string): FixedRuleContext {
    return new FixedRuleContext(new Date(`2026-11-06T${time}:00`));
}

function listCriterion(field: string, value: string): Criterion {
    return aCriterion({
        field,
        op: field === CRITERION_FIELD_IDS.Host
            ? CRITERION_OPERATOR_IDS.Domains
            : CRITERION_OPERATOR_IDS.OneOf,
        value,
    });
}

function notListCriterion(field: string, value: string): Criterion {
    return {
        ...listCriterion(field, value),
        negate: true,
    };
}

describe('CriteriaDnrCompiler', () => {
    test('staticallyAllows_WhenThereAreNoStaticItems_ShouldAllow', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [aCriterion()],
        };

        // Act
        const isAllowed = CriteriaDnrCompiler.staticallyAllows(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(isAllowed).toBe(true);
    });

    test('staticallyAllows_WhenStaticItemFailsUnderAll_ShouldBlock', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion(),
                OFFICE_HOURS,
            ],
        };

        // Act
        const early = CriteriaDnrCompiler.staticallyAllows(
            /* criteria: */ criteria,
            /* context: */ contextAt('08:00'),
        );
        const office = CriteriaDnrCompiler.staticallyAllows(
            /* criteria: */ criteria,
            /* context: */ contextAt('10:00'),
        );

        // Assert
        expect(early).toBe(false);
        expect(office).toBe(true);
    });

    test('staticallyAllows_WhenStaticItemFailsUnderAnyWithDynamicItem_ShouldAllow', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.Any,
            items: [
                OFFICE_HOURS,
                aCriterion(),
            ],
        };

        // Act
        const isAllowed = CriteriaDnrCompiler.staticallyAllows(
            /* criteria: */ criteria,
            /* context: */ contextAt('08:00'),
        );

        // Assert
        expect(isAllowed).toBe(true);
    });

    test('staticallyAllows_WhenEveryItemIsStaticAndFailsUnderAny_ShouldBlock', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.Any,
            items: [
                OFFICE_HOURS,
                EVENING,
            ],
        };

        // Act
        const isAllowed = CriteriaDnrCompiler.staticallyAllows(
            /* criteria: */ criteria,
            /* context: */ contextAt('23:00'),
        );

        // Assert
        expect(isAllowed).toBe(false);
    });

    test('compile_WhenMatchAllMixesRegexAndConditionPatches_ShouldMergeIntoOneCondition', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion({
                    value: 'https://api.example.com/*',
                }),
                aCriterion({
                    field: CRITERION_FIELD_IDS.Method,
                    op: CRITERION_OPERATOR_IDS.OneOf,
                    value: 'get',
                }),
                aCriterion({
                    field: CRITERION_FIELD_IDS.Host,
                    op: CRITERION_OPERATOR_IDS.Domains,
                    value: 'cdn.example.com',
                    negate: true,
                }),
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    regexFilter: '^https://api\\.example\\.com/.*$',
                    requestMethods: ['get'],
                    excludedRequestDomains: ['cdn.example.com'],
                },
            ],
        });
    });

    test('compile_WhenMatchAllHasTwoHostExclusions_ShouldExcludeEveryListedHost', () => {
        // Arrange
        const criteria = criteriaOf(
            /* ...items: */ notListCriterion(CRITERION_FIELD_IDS.Host, 'cdn.example.com'),
            /* ...items: */ notListCriterion(CRITERION_FIELD_IDS.Host, 'ads.example.com, cdn.example.com'),
        );

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    excludedRequestDomains: [
                        'cdn.example.com',
                        'ads.example.com',
                    ],
                },
            ],
        });
    });

    test('compile_WhenMatchAllHasTwoHostInclusions_ShouldKeepOnlyHostsInBoth', () => {
        // Arrange
        const criteria = criteriaOf(
            /* ...items: */ listCriterion(CRITERION_FIELD_IDS.Host, 'example.com, other.test'),
            /* ...items: */ listCriterion(
                /* field: */ CRITERION_FIELD_IDS.Host,
                /* value: */ 'api.example.com, third.test, other.test',
            ),
        );

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    requestDomains: [
                        'api.example.com',
                        'other.test',
                    ],
                },
            ],
        });
    });

    test('compile_WhenMatchAllHasTwoMethodLists_ShouldKeepOnlyMethodsInBoth', () => {
        // Arrange
        const criteria = criteriaOf(
            /* ...items: */ listCriterion(CRITERION_FIELD_IDS.Method, 'GET, POST'),
            /* ...items: */ listCriterion(CRITERION_FIELD_IDS.Method, 'POST, PUT'),
        );

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    requestMethods: ['post'],
                },
            ],
        });
    });

    test('compile_WhenMatchAllIncludesAndExcludesMethods_ShouldKeepTheDifference', () => {
        // Arrange
        const criteria = criteriaOf(
            /* ...items: */ listCriterion(CRITERION_FIELD_IDS.Method, 'GET, POST'),
            /* ...items: */ notListCriterion(CRITERION_FIELD_IDS.Method, 'POST'),
        );

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    requestMethods: ['get'],
                },
            ],
        });
    });

    test('compile_WhenMatchAllHasTwoResourceTypeExclusions_ShouldExcludeEveryListedType', () => {
        // Arrange
        const criteria = criteriaOf(
            /* ...items: */ notListCriterion(CRITERION_FIELD_IDS.ResourceType, 'image'),
            /* ...items: */ notListCriterion(CRITERION_FIELD_IDS.ResourceType, 'font'),
        );

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    excludedResourceTypes: [
                        'image',
                        'font',
                    ],
                },
            ],
        });
    });

    test.each([
        [
            listCriterion(CRITERION_FIELD_IDS.Host, 'example.com'),
            listCriterion(CRITERION_FIELD_IDS.Host, 'other.test'),
        ],
        [
            listCriterion(CRITERION_FIELD_IDS.Method, 'GET'),
            listCriterion(CRITERION_FIELD_IDS.Method, 'POST'),
        ],
        [
            listCriterion(CRITERION_FIELD_IDS.Method, 'GET'),
            notListCriterion(CRITERION_FIELD_IDS.Method, 'get'),
        ],
        [
            listCriterion(CRITERION_FIELD_IDS.ResourceType, 'script'),
            listCriterion(CRITERION_FIELD_IDS.ResourceType, 'image'),
        ],
        [
            listCriterion(CRITERION_FIELD_IDS.ResourceType, 'image, font'),
            notListCriterion(CRITERION_FIELD_IDS.ResourceType, 'font, image'),
        ],
    ])('compile_WhenMatchAllListsLeaveNothing(%#)_ShouldFailAsNeverMatching', (first, second) => {
        // Arrange
        const criteria = criteriaOf(first, second);

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: true,
            error: NEVER_MATCHES_MESSAGE,
        });
    });

    test('compile_WhenMatchAllHasTwoRegexItems_ShouldFail', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion(),
                USERS_PATH,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: true,
            error: 'With more than one URL, path, extension, host pattern or query condition the rule works on the inspected tab only.',
        });
    });

    test('compile_WhenMatchAnyHasTwoRegexItems_ShouldReturnOneConditionPerItem', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.Any,
            items: [
                aCriterion({
                    value: 'https://api.example.com/*',
                }),
                USERS_PATH,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    regexFilter: '^https://api\\.example\\.com/.*$',
                },
                {
                    regexFilter: '^[a-z][a-z0-9+.-]*://[^/?#]+/api/v1/users(?:[?#].*)?$',
                },
            ],
        });
    });

    test.each([
        CRITERIA_MATCHES.All,
        CRITERIA_MATCHES.Any,
    ])('compile_WhenItemNeedsTheDebuggerUnder(%s)_ShouldFailWithItsReason', match => {
        // Arrange
        const criteria: RuleCriteria = {
            match,
            items: [
                aCriterion(),
                aCriterion({
                    field: CRITERION_FIELD_IDS.RequestHeader,
                    op: CRITERION_OPERATOR_IDS.Exists,
                    name: 'Authorization',
                }),
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: true,
            error: 'Request header conditions work on the inspected tab only.',
        });
    });

    test('compile_WhenFieldIsUnknown_ShouldFail', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion({
                    field: 'referrer',
                }),
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ aRuleContext(),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: true,
            error: 'Unknown criterion "referrer".',
        });
    });

    test('compile_WhenStaticItemsBlock_ShouldReturnNoConditions', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion(),
                OFFICE_HOURS,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ contextAt('08:00'),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('compile_WhenStaticItemPassesUnderAll_ShouldLeaveItOutOfTheCondition', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                OFFICE_HOURS,
                USERS_PATH,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ contextAt('10:00'),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    regexFilter: '^[a-z][a-z0-9+.-]*://[^/?#]+/api/v1/users(?:[?#].*)?$',
                },
            ],
        });
    });

    test('compile_WhenStaticItemPassesUnderAny_ShouldMatchEveryRequest', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.Any,
            items: [
                EVENING,
                aCriterion(),
                USERS_PATH,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(
            /* criteria: */ criteria,
            /* context: */ contextAt('19:00'),
        );

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [{}],
        });
    });
});
