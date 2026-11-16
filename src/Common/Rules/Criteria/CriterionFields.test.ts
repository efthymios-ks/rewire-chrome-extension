import { describe, expect, test } from 'vitest';
import type { RuleContext } from '../Context/RuleContext';
import { CriterionFieldRegistry } from './CriterionFieldRegistry';
import type { DnrFragment } from './DnrFragment';
import { DNR_FRAGMENT_KIND } from './DnrFragmentKind';
import type { MatchFacts } from '../Drafts/MatchFacts';
import type { Criterion } from '../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { FixedRuleContext } from '../../../FixedRuleContext';
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext, TEST_URLS } from '../../../TestData';

interface ReadOfOptions {
    criterion: Criterion;
    facts: MatchFacts;
    context?: RuleContext;
}

function readOf({ criterion, facts, context = aRuleContext() }: ReadOfOptions): string[] {
    const field = CriterionFieldRegistry.get(criterion.field);
    if (field == null) {
        throw new Error(`Field "${criterion.field}" is not registered.`);
    }

    return field.read({ facts, criterion, context });
}

function readFromContext(fieldId: string, context: RuleContext): string[] {
    return readOf({
        criterion: aCriterion({
            field: fieldId,
        }),
        facts: requestFacts(TEST_URLS.UsersProfile),
        context,
    });
}

function dnrOf(criterion: Criterion): DnrFragment {
    const field = CriterionFieldRegistry.get(criterion.field);
    if (field == null) {
        throw new Error(`Field "${criterion.field}" is not registered.`);
    }

    return field.toDnr(criterion);
}

function regexOf(criterion: Criterion): RegExp {
    const fragment = dnrOf(criterion);
    if (fragment.kind !== DNR_FRAGMENT_KIND.Regex) {
        throw new Error('The criterion did not compile to a regex.');
    }

    return new RegExp(fragment.source);
}

function requestFacts(url: string): MatchFacts {
    return {
        request: aRequestDraft({
            url,
        }),
        response: null,
    };
}

describe('CriterionFields', () => {
    test('read_WhenUrlIsParsed_ShouldReturnHostPathAndExtension', () => {
        // Arrange
        const facts = requestFacts('https://CDN.Example.com:8443/assets/App.JS?v=1');

        // Act
        const host = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.Host }),
            facts,
        });
        const path = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.Path }),
            facts,
        });
        const extension = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.Extension }),
            facts,
        });

        // Assert
        expect(host).toEqual(['cdn.example.com']);
        expect(path).toEqual(['/assets/App.JS']);
        expect(extension).toEqual(['js']);
    });

    test('read_WhenUrlCannotBeParsed_ShouldReturnNoHostPathOrQuery', () => {
        // Arrange
        const facts = requestFacts('not a url');

        // Act
        const host = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.Host }),
            facts,
        });
        const path = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.Path }),
            facts,
        });
        const query = readOf({
            criterion: aCriterion({
                field: CRITERION_FIELD_IDS.Query,
                name: 'page',
            }),
            facts,
        });

        // Assert
        expect(host).toEqual([]);
        expect(path).toEqual([]);
        expect(query).toEqual([]);
    });

    test('read_WhenQueryRepeatsName_ShouldReturnEveryValue', () => {
        // Arrange
        const facts = requestFacts('https://api.example.com/search?tag=a&tag=b%20c&page=2');

        // Act
        const values = readOf({
            criterion: aCriterion({
                field: CRITERION_FIELD_IDS.Query,
                name: 'tag',
            }),
            facts,
        });

        // Assert
        expect(values).toEqual([
            'a',
            'b c',
        ]);
    });

    test('read_WhenRequestHasCookieHeader_ShouldReturnNamedCookie', () => {
        // Arrange
        const facts: MatchFacts = {
            request: aRequestDraft({
                headers: [
                    {
                        name: 'cookie',
                        value: 'session=abc; theme=dark',
                    },
                ],
            }),
            response: null,
        };

        // Act
        const values = readOf({
            criterion: aCriterion({
                field: CRITERION_FIELD_IDS.RequestCookie,
                name: 'theme',
            }),
            facts,
        });

        // Assert
        expect(values).toEqual(['dark']);
    });

    test('read_WhenResponseIsMissingOrKnown_ShouldReadStatusAndLowercaseContentType', () => {
        // Arrange
        const pending = requestFacts('https://api.example.com/users');
        const answered: MatchFacts = {
            request: aRequestDraft(),
            response: aResponseDraft({
                status: 404,
                headers: [
                    {
                        name: 'content-type',
                        value: 'Application/JSON',
                    },
                ],
            }),
        };

        // Act
        const pendingStatus = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.ResponseStatus }),
            facts: pending,
        });
        const answeredStatus = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.ResponseStatus }),
            facts: answered,
        });
        const contentType = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.ContentType }),
            facts: answered,
        });

        // Assert
        expect(pendingStatus).toEqual([]);
        expect(answeredStatus).toEqual(['404']);
        expect(contentType).toEqual(['application/json']);
    });

    test('read_WhenFieldComesFromContext_ShouldUseClockAndRandom', () => {
        // Arrange
        const context = new FixedRuleContext(
            /* now: */ new Date('2026-11-06T09:05:00'),
            /* random: */ 0.25,
        );

        // Act
        const time = readFromContext(CRITERION_FIELD_IDS.TimeWindow, context);
        const sample = readFromContext(CRITERION_FIELD_IDS.Sample, context);

        // Assert
        expect(time).toEqual(['09:05']);
        expect(sample).toEqual(['25']);
    });

    test('read_WhenFieldIsResourceType_ShouldReadXhrAsBothFetchAndXhr', () => {
        // Arrange
        const facts: MatchFacts = {
            request: aRequestDraft({
                resourceType: 'XHR',
            }),
            response: null,
        };

        // Act
        const values = readOf({
            criterion: aCriterion({ field: CRITERION_FIELD_IDS.ResourceType }),
            facts,
        });

        // Assert
        expect(values).toEqual([
            'fetch',
            'xhr',
        ]);
    });

    test('toDnr_WhenUrlWildcard_ShouldReturnAnchoredRegex', () => {
        // Arrange
        const criterion = aCriterion({
            value: 'https://api.example.com/*',
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Regex,
            source: '^https://api\\.example\\.com/.*$',
        });
    });

    test.each([
        [
            CRITERION_FIELD_IDS.Url,
            CRITERION_OPERATOR_IDS.Wildcard,
            true,
        ],
        [
            CRITERION_FIELD_IDS.Path,
            CRITERION_OPERATOR_IDS.Regex,
            false,
        ],
        [
            CRITERION_FIELD_IDS.Query,
            CRITERION_OPERATOR_IDS.Regex,
            false,
        ],
        [
            CRITERION_FIELD_IDS.Extension,
            CRITERION_OPERATOR_IDS.OneOf,
            true,
        ],
        [
            CRITERION_FIELD_IDS.RequestHeader,
            CRITERION_OPERATOR_IDS.Wildcard,
            false,
        ],
        [
            CRITERION_FIELD_IDS.RequestCookie,
            CRITERION_OPERATOR_IDS.Wildcard,
            false,
        ],
        [
            CRITERION_FIELD_IDS.ResponseStatus,
            CRITERION_OPERATOR_IDS.Range,
            false,
        ],
        [
            CRITERION_FIELD_IDS.Sample,
            CRITERION_OPERATOR_IDS.Percent,
            false,
        ],
        [
            CRITERION_FIELD_IDS.TimeWindow,
            CRITERION_OPERATOR_IDS.Between,
            false,
        ],
        [
            CRITERION_FIELD_IDS.Url,
            'constructor',
            false,
        ],
        [
            CRITERION_FIELD_IDS.Path,
            'toString',
            false,
        ],
    ])('toDnr_WhenFieldIs(%s)WithOperator(%s)AndNegateIs(%s)_ShouldBeUnsupported', (
        field,
        op,
        isNegated,
    ) => {
        // Arrange
        const criterion = aCriterion({
            field,
            op,
            name: 'x',
            value: '1',
            negate: isNegated,
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment.kind).toBe(DNR_FRAGMENT_KIND.Unsupported);
    });

    test.each([
        [
            CRITERION_FIELD_IDS.Host,
            CRITERION_OPERATOR_IDS.Domains,
            ', *.',
        ],
        [
            CRITERION_FIELD_IDS.Method,
            CRITERION_OPERATOR_IDS.OneOf,
            ' , ',
        ],
        [
            CRITERION_FIELD_IDS.ResourceType,
            CRITERION_OPERATOR_IDS.OneOf,
            'scirpt',
        ],
        [
            CRITERION_FIELD_IDS.Extension,
            CRITERION_OPERATOR_IDS.OneOf,
            '.',
        ],
    ])('toDnr_WhenListOf(%s)With(%s)Is(%s)Empty_ShouldBeUnsupported', (
        field,
        op,
        value,
    ) => {
        // Arrange
        const included = aCriterion({ field, op, value });
        const excluded = aCriterion({ field, op, value, negate: true });

        // Act
        const includedFragment = dnrOf(included);
        const excludedFragment = dnrOf(excluded);

        // Assert
        expect(includedFragment.kind).toBe(DNR_FRAGMENT_KIND.Unsupported);
        expect(excludedFragment.kind).toBe(DNR_FRAGMENT_KIND.Unsupported);
    });

    test('toDnr_WhenHostDomainsIsNegated_ShouldExcludeDomains', () => {
        // Arrange
        const included = aCriterion({
            field: CRITERION_FIELD_IDS.Host,
            op: CRITERION_OPERATOR_IDS.Domains,
            value: 'Example.com, .cdn.example.org',
        });
        const excluded = aCriterion({
            field: CRITERION_FIELD_IDS.Host,
            op: CRITERION_OPERATOR_IDS.Domains,
            value: 'example.com',
            negate: true,
        });

        // Act
        const includedFragment = dnrOf(included);
        const excludedFragment = dnrOf(excluded);

        // Assert
        expect(includedFragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Condition,
            patch: {
                requestDomains: [
                    'example.com',
                    'cdn.example.org',
                ],
            },
        });
        expect(excludedFragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Condition,
            patch: {
                excludedRequestDomains: ['example.com'],
            },
        });
    });

    test('toDnr_WhenMethodListHasUnknownAndRepeatedMethods_ShouldMapToOtherOnce', () => {
        // Arrange
        const criterion = aCriterion({
            field: CRITERION_FIELD_IDS.Method,
            op: CRITERION_OPERATOR_IDS.OneOf,
            value: 'GET, purge, get LINK',
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Condition,
            patch: {
                requestMethods: [
                    'get',
                    'other',
                ],
            },
        });
    });

    test('toDnr_WhenResourceTypesAreListed_ShouldMapToBrowserTypes', () => {
        // Arrange
        const criterion = aCriterion({
            field: CRITERION_FIELD_IDS.ResourceType,
            op: CRITERION_OPERATOR_IDS.OneOf,
            value: 'fetch, XHR document',
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Condition,
            patch: {
                resourceTypes: [
                    'xmlhttprequest',
                    'main_frame',
                    'sub_frame',
                ],
            },
        });
    });

    test('toDnr_WhenPathWildcardHasNoStar_ShouldMatchPathOnAnyHostWithQueryOnly', () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CRITERION_FIELD_IDS.Path,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            value: '/api/v1/users',
        }));

        // Act
        const matchesWithQuery = regex.test('https://api.example.com:8443/api/v1/users?page=2');
        const matchesDeeperPath = regex.test('https://api.example.com/api/v1/users/42');

        // Assert
        expect(matchesWithQuery).toBe(true);
        expect(matchesDeeperPath).toBe(false);
    });

    test('toDnr_WhenExtensionsAreListed_ShouldMatchAnyBeforeTheQuery', () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CRITERION_FIELD_IDS.Extension,
            op: CRITERION_OPERATOR_IDS.OneOf,
            value: '.JS, css',
        }));

        // Act
        const matchesScript = regex.test('https://cdn.example.com/app.js?v=1');
        const matchesStyle = regex.test('https://cdn.example.com/site.css');
        const matchesJson = regex.test('https://cdn.example.com/data.json');

        // Assert
        expect(matchesScript).toBe(true);
        expect(matchesStyle).toBe(true);
        expect(matchesJson).toBe(false);
    });

    test('toDnr_WhenQueryWildcardHasNoWildcards_ShouldMatchEncodedNameAndValue', () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CRITERION_FIELD_IDS.Query,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            name: 'q',
            value: 'a b',
        }));

        // Act
        const matchesExact = regex.test('https://api.example.com/search?page=1&q=a%20b');
        const matchesLonger = regex.test('https://api.example.com/search?q=a%20bc');

        // Assert
        expect(matchesExact).toBe(true);
        expect(matchesLonger).toBe(false);
    });

    test('toDnr_WhenQueryWildcardEscapesAStar_ShouldMatchTheLiteralStar', () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CRITERION_FIELD_IDS.Query,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            name: 'q',
            value: 'a\\*',
        }));

        // Act
        const matchesLiteral = regex.test('https://api.example.com/search?q=a*');
        const matchesLonger = regex.test('https://api.example.com/search?q=abc');

        // Assert
        expect(matchesLiteral).toBe(true);
        expect(matchesLonger).toBe(false);
    });

    test('toDnr_WhenQueryWildcardHasAStar_ShouldBeUnsupported', () => {
        // Arrange
        const criterion = aCriterion({
            field: CRITERION_FIELD_IDS.Query,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            name: 'q',
            value: 'a*',
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment.kind).toBe(DNR_FRAGMENT_KIND.Unsupported);
    });

    test('toDnr_WhenHostWildcard_ShouldNotMatchHostTextInsideThePath', () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CRITERION_FIELD_IDS.Host,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            value: '*.example.com',
        }));

        // Act
        const matchesSubdomain = regex.test('https://api.example.com/users');
        const matchesOtherHost = regex.test('https://other.test/x.example.com/users');

        // Assert
        expect(matchesSubdomain).toBe(true);
        expect(matchesOtherHost).toBe(false);
    });

    test('toDnr_WhenPathWildcard_ShouldNotMatchAcrossTheQuery', () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CRITERION_FIELD_IDS.Path,
            op: CRITERION_OPERATOR_IDS.Wildcard,
            value: '/api/*/profile',
        }));

        // Act
        const matchesInPath = regex.test('https://api.example.com/api/42/profile');
        const matchesInQuery = regex.test('https://api.example.com/api/42?next=/profile');

        // Assert
        expect(matchesInPath).toBe(true);
        expect(matchesInQuery).toBe(false);
    });
});
