import { describe, expect, test } from 'vitest';
import { CriterionOperatorRegistry } from './CriterionOperatorRegistry';
import type { CriterionOperator } from './CriterionOperators';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';

function operatorOf(id: string): CriterionOperator {
    const operator = CriterionOperatorRegistry.get(id);
    if (operator == null) {
        throw new Error(`Operator "${id}" is not registered.`);
    }

    return operator;
}

describe('CriterionOperators', () => {
    test.each([
        [
            '404',
            '404',
            true,
        ],
        [
            '4xx',
            '404',
            true,
        ],
        [
            '4XX',
            '500',
            false,
        ],
        [
            '500-599',
            '503',
            true,
        ],
        [
            '500 - 599',
            '600',
            false,
        ],
        [
            '404, 5xx',
            '502',
            true,
        ],
    ])('test_WhenRangeIs(%s)AndStatusIs(%s)_ShouldReturn(%s)', (
        range,
        status,
        expected,
    ) => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Range);

        // Act
        const isMatch = operator.test({ values: [status], expected: range });

        // Assert
        expect(isMatch).toBe(expected);
    });

    test.each([
        [
            '09:00-17:30',
            '09:00',
            true,
        ],
        [
            '09:00-17:30',
            '17:30',
            false,
        ],
        [
            '22:00-02:00',
            '23:15',
            true,
        ],
        [
            '22:00-02:00',
            '01:59',
            true,
        ],
        [
            '22:00-02:00',
            '12:00',
            false,
        ],
        [
            'morning',
            '09:00',
            false,
        ],
    ])('test_WhenWindowIs(%s)AndTimeIs(%s)_ShouldReturn(%s)', (
        window,
        time,
        expected,
    ) => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Between);

        // Act
        const isMatch = operator.test({ values: [time], expected: window });

        // Assert
        expect(isMatch).toBe(expected);
    });

    test('test_WhenOneOfListMixesSeparatorsAndCase_ShouldMatchIgnoringCase', () => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.OneOf);

        // Act
        const matchesPost = operator.test({ values: ['POST'], expected: ' get,Post  put ' });
        const matchesDelete = operator.test({ values: ['DELETE'], expected: ' get,Post  put ' });

        // Assert
        expect(matchesPost).toBe(true);
        expect(matchesDelete).toBe(false);
    });

    test('test_WhenExistsGetsAnyValue_ShouldMatchEvenAnEmptyOne', () => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Exists);

        // Act
        const matchesEmptyValue = operator.test({ values: [''], expected: '' });
        const matchesNoValues = operator.test({ values: [], expected: '' });

        // Assert
        expect(operator.needsValue).toBe(false);
        expect(matchesEmptyValue).toBe(true);
        expect(matchesNoValues).toBe(false);
    });

    test('test_WhenSampleIsBelowPercent_ShouldMatch', () => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Percent);

        // Act
        const matchesBelow = operator.test({ values: ['9.99'], expected: '10' });
        const matchesAtLimit = operator.test({ values: ['10'], expected: '10' });

        // Assert
        expect(matchesBelow).toBe(true);
        expect(matchesAtLimit).toBe(false);
    });

    test('test_WhenHostIsSubdomainOfListedDomain_ShouldMatch', () => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Domains);
        const expected = 'example.com, example.org';

        // Act
        const matchesSubdomain = operator.test({ values: ['auth.example.com'], expected });
        const matchesLookalike = operator.test({ values: ['badexample.com'], expected });

        // Assert
        expect(matchesSubdomain).toBe(true);
        expect(matchesLookalike).toBe(false);
    });

    test('test_WhenRegexIsInvalid_ShouldNotMatch', () => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Regex);

        // Act
        const isMatch = operator.test({ values: ['https://api.example.com/('], expected: '(' });

        // Assert
        expect(isMatch).toBe(false);
    });

    test('test_WhenAnyValueMatchesWildcard_ShouldMatch', () => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Wildcard);
        const values = [
            'text/html',
            'application/json; charset=utf-8',
        ];

        // Act
        const isMatch = operator.test({ values, expected: 'application/json*' });

        // Assert
        expect(isMatch).toBe(true);
    });

    test.each([
        CRITERION_OPERATOR_IDS.Wildcard,
        CRITERION_OPERATOR_IDS.Regex,
    ])('test_WhenOperator(%s)IsCaseInsensitive_ShouldIgnoreCaseOnlyThen', id => {
        // Arrange
        const operator = operatorOf(id);
        const values = ['https://api.example.com/users'];

        // Act
        const matchesExactCase = operator.test({ values, expected: '*/Users', isCaseInsensitive: false });
        const matchesAnyCase = operator.test({ values, expected: '*/Users', isCaseInsensitive: true });

        // Assert
        expect(matchesExactCase).toBe(false);
        expect(matchesAnyCase).toBe(id === CRITERION_OPERATOR_IDS.Wildcard);
    });

    test('test_WhenRegexIsCaseInsensitive_ShouldKeepEscapesIntact', () => {
        // Arrange
        const operator = operatorOf(CRITERION_OPERATOR_IDS.Regex);
        const values = ['https://api.example.com/USERS/42'];

        // Act
        const matchesDigits = operator.test({ values, expected: '/users/\\d+$', isCaseInsensitive: true });
        const matchesNonDigits = operator.test({ values, expected: '/users/\\D+$', isCaseInsensitive: true });

        // Assert
        expect(matchesDigits).toBe(true);
        expect(matchesNonDigits).toBe(false);
    });
});
