import { describe, expect, test } from 'vitest';
import { CriteriaDnrCompiler } from './CriteriaDnrCompiler';
import { CriteriaEvaluator } from './CriteriaEvaluator';
import { CRITERIA_OUTCOME } from './CriteriaOutcome';
import { CRITERION_STAGE } from './CriterionStage';
import type { MatchFacts } from '../Drafts/MatchFacts';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import type { RuleCriteria } from '../../../Contracts/Rules/RuleCriteria';
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext, criteriaOf } from '../../../TestData';

const REQUEST_FACTS: MatchFacts = {
    request: aRequestDraft(),
    response: null,
};

const POST_METHOD = aCriterion({
    field: CRITERION_FIELD_IDS.Method,
    op: CRITERION_OPERATOR_IDS.OneOf,
    value: 'POST',
});

const SERVER_ERROR_STATUS = aCriterion({
    field: CRITERION_FIELD_IDS.ResponseStatus,
    op: CRITERION_OPERATOR_IDS.Range,
    value: '5xx',
});

const SEARCH_URL = 'https://api.example.com/search';

interface EngineVerdicts {
    evaluator: boolean;
    browser: boolean;
}

function verdictsOf(criterion: Criterion, url: string): EngineVerdicts {
    const criteria = criteriaOf(criterion);
    const evaluation = CriteriaEvaluator.evaluate({
        criteria,
        facts: {
            request: aRequestDraft({
                url,
            }),
            response: null,
        },
        context: aRuleContext(),
    });
    const compiled = CriteriaDnrCompiler.compile(criteria, aRuleContext());
    if (compiled.hasErrors) {
        throw new Error(compiled.error);
    }

    const [condition] = compiled.value;
    if (condition?.regexFilter == null || condition.isUrlFilterCaseSensitive != null) {
        throw new Error('The criterion did not compile to a regex with the default case handling.');
    }

    return {
        evaluator: evaluation.outcome === CRITERIA_OUTCOME.Matched,
        browser: new RegExp(condition.regexFilter, 'i').test(url),
    };
}

function browserFormsOf(name: string, value: string): string[] {
    const typed = new URL(SEARCH_URL);
    typed.search = `?${name}=${value}`;

    return [
        typed.href,
        `${SEARCH_URL}?${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        `${SEARCH_URL}?${new URLSearchParams([[name, value]]).toString()}`,
    ];
}

describe('CriteriaEvaluator', () => {
    test('evaluate_WhenAllItemsMatch_ShouldMatch', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion(),
                aCriterion({
                    field: CRITERION_FIELD_IDS.Method,
                    op: CRITERION_OPERATOR_IDS.OneOf,
                    value: 'get, post',
                }),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.Matched);
        expect(evaluation.results.map(result => result.passed)).toEqual([
            true,
            true,
        ]);
    });

    test('evaluate_WhenOneItemFailsUnderAll_ShouldNotMatch', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion(),
                POST_METHOD,
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.NotMatched);
        expect(evaluation.results[1]).toEqual({
            label: 'Method is one of POST',
            passed: false,
            actual: 'GET',
        });
    });

    test('evaluate_WhenAnyItemMatches_ShouldMatch', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.Any,
            items: [
                POST_METHOD,
                aCriterion(),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.Matched);
    });

    test.each([
        CRITERIA_MATCHES.All,
        CRITERIA_MATCHES.Any,
    ])('evaluate_WhenItemsAreEmptyUnder(%s)_ShouldMatch', match => {
        // Arrange
        const criteria: RuleCriteria = {
            match,
            items: [],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.Matched);
    });

    test('evaluate_WhenResponseFieldAndNoResponseYet_ShouldDefer', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                POST_METHOD,
                SERVER_ERROR_STATUS,
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.Deferred);
        expect(evaluation.results[1]).toEqual({
            label: 'Response status is in range 5xx',
            passed: null,
            actual: 'known after the response',
        });
    });

    test('evaluate_WhenResponseIsKnown_ShouldEvaluateResponseFields', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [SERVER_ERROR_STATUS],
        };
        const facts: MatchFacts = {
            request: aRequestDraft(),
            response: aResponseDraft({
                status: 503,
            }),
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.Matched);
        expect(evaluation.results[0]?.actual).toBe('503');
    });

    test('evaluate_WhenItemIsNegated_ShouldInvertTheResult', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion({
                    negate: true,
                }),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.NotMatched);
        expect(evaluation.results[0]?.label).toBe('NOT (URL matches wildcard */api/v1/users/*)');
    });

    test('evaluate_WhenFieldIsUnknownOrValueIsMissing_ShouldFailWithExplanation', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.Any,
            items: [
                aCriterion({
                    field: 'referrer',
                }),
                aCriterion({
                    field: CRITERION_FIELD_IDS.RequestHeader,
                    op: CRITERION_OPERATOR_IDS.Exists,
                    name: 'X-Missing',
                }),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.NotMatched);
        expect(evaluation.results.map(result => result.actual)).toEqual([
            'unknown field or operator',
            '(none)',
        ]);
    });

    test('describe_WhenOperatorNeedsNoValue_ShouldOmitValueAndQuoteName', () => {
        // Arrange
        const criterion = aCriterion({
            field: CRITERION_FIELD_IDS.Query,
            op: CRITERION_OPERATOR_IDS.Exists,
            name: 'debug',
            value: 'ignored',
        });

        // Act
        const text = CriteriaEvaluator.describe(criterion);

        // Assert
        expect(text).toBe('Query parameter "debug" exists');
    });

    test('describe_WhenFieldAndOperatorAreUnknown_ShouldFallBackToIds', () => {
        // Arrange
        const criterion = aCriterion({
            field: 'referrer',
            op: 'startsWith',
            value: 'https://',
        });

        // Act
        const text = CriteriaEvaluator.describe(criterion);

        // Assert
        expect(text).toBe('referrer startsWith https://');
    });

    test.each([
        [
            'FieldIsUnknown',
            aCriterion({
                field: 'referrer',
            }),
            'Unknown criterion "referrer".',
        ],
        [
            'OperatorDoesNotFitField',
            aCriterion({
                op: CRITERION_OPERATOR_IDS.Range,
            }),
            "URL can't use \"range\".",
        ],
        [
            'NameIsBlank',
            aCriterion({
                field: CRITERION_FIELD_IDS.RequestHeader,
                op: CRITERION_OPERATOR_IDS.Wildcard,
                name: ' ',
            }),
            'Request header needs a name.',
        ],
        [
            'ValueIsBlank',
            aCriterion({
                value: '  ',
            }),
            'URL needs a value.',
        ],
        [
            'RegexIsInvalid',
            aCriterion({
                op: CRITERION_OPERATOR_IDS.Regex,
                value: '(',
            }),
            'URL regex is invalid:',
        ],
        [
            'ResourceTypeIsUnknown',
            aCriterion({
                field: CRITERION_FIELD_IDS.ResourceType,
                op: CRITERION_OPERATOR_IDS.OneOf,
                value: 'fetch, scirpt',
            }),
            'Resource type "scirpt" is not known. Use fetch, xhr, document, script, stylesheet, image, font, media, websocket, ping or other.',
        ],
        [
            'DomainListIsEmpty',
            aCriterion({
                field: CRITERION_FIELD_IDS.Host,
                op: CRITERION_OPERATOR_IDS.Domains,
                value: ', *. ;',
            }),
            'Host needs at least one domain.',
        ],
        [
            'MethodListIsEmpty',
            aCriterion({
                field: CRITERION_FIELD_IDS.Method,
                op: CRITERION_OPERATOR_IDS.OneOf,
                value: ', ,',
            }),
            'Method needs at least one value.',
        ],
        [
            'ResourceTypeListIsEmpty',
            aCriterion({
                field: CRITERION_FIELD_IDS.ResourceType,
                op: CRITERION_OPERATOR_IDS.OneOf,
                value: ',',
            }),
            'Resource type needs at least one value.',
        ],
        [
            'ExtensionListIsEmpty',
            aCriterion({
                field: CRITERION_FIELD_IDS.Extension,
                op: CRITERION_OPERATOR_IDS.OneOf,
                value: '. ,',
            }),
            'File extension needs at least one value.',
        ],
    ])('validate_When%s_ShouldReportOneError', (
        _case,
        criterion,
        expectedMessage,
    ) => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [criterion],
        };

        // Act
        const errors = CriteriaEvaluator.validate(criteria);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(expectedMessage);
    });

    test('validate_WhenCriteriaAreComplete_ShouldReportNothing', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.All,
            items: [
                aCriterion(),
                aCriterion({
                    field: CRITERION_FIELD_IDS.Query,
                    op: CRITERION_OPERATOR_IDS.Exists,
                    name: 'debug',
                    value: '',
                }),
                aCriterion({
                    op: CRITERION_OPERATOR_IDS.Regex,
                    value: '^https://api\\.example\\.com/(?P<id>\\d+)$',
                }),
            ],
        };

        // Act
        const errors = CriteriaEvaluator.validate(criteria);

        // Assert
        expect(errors).toEqual([]);
    });

    test('hasStage_WhenAnyItemReadsTheResponse_ShouldReportResponseStage', () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CRITERIA_MATCHES.Any,
            items: [
                aCriterion(),
                SERVER_ERROR_STATUS,
            ],
        };

        // Act
        const hasResponse = CriteriaEvaluator.hasStage(criteria, CRITERION_STAGE.Response);
        const hasStatic = CriteriaEvaluator.hasStage(criteria, CRITERION_STAGE.Static);

        // Assert
        expect(hasResponse).toBe(true);
        expect(hasStatic).toBe(false);
    });

    test.each([
        '.js',
        'js',
        'JS',
        '.JS, css',
    ])('evaluate_WhenExtensionListIs(%s)_ShouldMatchLikeTheBrowserEngine', value => {
        // Arrange
        const criterion = aCriterion({
            field: CRITERION_FIELD_IDS.Extension,
            op: CRITERION_OPERATOR_IDS.OneOf,
            value,
        });

        // Act
        const verdicts = verdictsOf(criterion, 'https://cdn.example.com/assets/app.js?v=1');

        // Assert
        expect(verdicts).toEqual({
            evaluator: true,
            browser: true,
        });
    });

    test.each([
        [
            'UrlWildcard',
            aCriterion({
                value: '*/API/V1/Users/*',
            }),
            'https://api.example.com/api/v1/users/42',
            true,
        ],
        [
            'UrlRegex',
            aCriterion({
                op: CRITERION_OPERATOR_IDS.Regex,
                value: '/USERS/\\d+$',
            }),
            'https://api.example.com/api/v1/users/42',
            true,
        ],
        [
            'UrlWildcardOnAnotherPath',
            aCriterion({
                value: '*/Orders/*',
            }),
            'https://api.example.com/api/v1/users/42',
            false,
        ],
        [
            'PathWildcard',
            aCriterion({
                field: CRITERION_FIELD_IDS.Path,
                value: '/Users',
            }),
            'https://api.example.com/users',
            true,
        ],
        [
            'HostWildcard',
            aCriterion({
                field: CRITERION_FIELD_IDS.Host,
                value: '*.Example.COM',
            }),
            'https://api.example.com/users',
            true,
        ],
        [
            'QueryValue',
            aCriterion({
                field: CRITERION_FIELD_IDS.Query,
                name: 'Sort',
                value: 'Name',
            }),
            'https://api.example.com/users?sort=name',
            true,
        ],
        [
            'QueryName',
            aCriterion({
                field: CRITERION_FIELD_IDS.Query,
                op: CRITERION_OPERATOR_IDS.Exists,
                name: 'DEBUG',
                value: '',
            }),
            'https://api.example.com/users?debug=1',
            true,
        ],
    ])('evaluate_When%sDiffersOnlyInCase_ShouldMatchLikeTheBrowserEngine', (
        _case,
        criterion,
        url,
        expected,
    ) => {
        // Arrange
        const request = url;

        // Act
        const verdicts = verdictsOf(criterion, request);

        // Assert
        expect(verdicts).toEqual({
            evaluator: expected,
            browser: expected,
        });
    });

    test('evaluate_WhenHeaderValueDiffersOnlyInCase_ShouldStayCaseSensitive', () => {
        // Arrange
        const criteria = criteriaOf(aCriterion({
            field: CRITERION_FIELD_IDS.RequestHeader,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            name: 'Accept',
            value: 'Application/JSON',
        }));

        // Act
        const evaluation = CriteriaEvaluator.evaluate({
            criteria,
            facts: REQUEST_FACTS,
            context: aRuleContext(),
        });

        // Assert
        expect(evaluation.outcome).toBe(CRITERIA_OUTCOME.NotMatched);
    });

    test.each([
        '/home',
        'a:b',
        'a b',
        'a#b',
        'café',
        '100%',
    ])('evaluate_WhenQueryValueIs(%s)InAnyBrowserEncoding_ShouldMatchLikeTheBrowserEngine', value => {
        // Arrange
        const criterion = aCriterion({
            field: CRITERION_FIELD_IDS.Query,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            name: 'next',
            value,
        });

        // Act
        const verdicts = browserFormsOf('next', value).map(url => verdictsOf(criterion, url));

        // Assert
        expect(verdicts).toEqual([
            {
                evaluator: true,
                browser: true,
            },
            {
                evaluator: true,
                browser: true,
            },
            {
                evaluator: true,
                browser: true,
            },
        ]);
    });

    test.each([
        `${SEARCH_URL}?next=/homes`,
        `${SEARCH_URL}?next=%2Fhome%2F`,
        `${SEARCH_URL}?previous=/home`,
    ])('evaluate_WhenQueryValueOnlyResembles(%s)_ShouldMissLikeTheBrowserEngine', url => {
        // Arrange
        const criterion = aCriterion({
            field: CRITERION_FIELD_IDS.Query,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            name: 'next',
            value: '/home',
        });

        // Act
        const verdicts = verdictsOf(criterion, url);

        // Assert
        expect(verdicts).toEqual({
            evaluator: false,
            browser: false,
        });
    });
});
