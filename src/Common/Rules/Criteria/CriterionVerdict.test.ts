import { describe, expect, test } from 'vitest';
import { CriterionVerdict } from './CriterionVerdict';
import type { CriterionField } from './CriterionField';
import { CriterionOperatorRegistry } from './CriterionOperatorRegistry';
import type { CriterionOperator } from './CriterionOperators';
import { CRITERION_STAGE } from './CriterionStage';
import { DnrFragments } from './DnrFragments';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { aCriterion } from '../../../TestData';

const API_PATTERN = '*/api/*';
const API_URL = 'https://example.com/api/users';
const HOME_URL = 'https://example.com/home';

function aField(overrides: Partial<CriterionField> = {}): CriterionField {
    return {
        id: CRITERION_FIELD_IDS.Url,
        label: 'URL',
        stage: CRITERION_STAGE.Request,
        operators: [CRITERION_OPERATOR_IDS.Wildcard],
        needsName: false,
        valuePlaceholder: '',
        read: () => [],
        toDnr: () => DnrFragments.unsupported('Not compiled in this test.'),
        ...overrides,
    };
}

function wildcardOperator(): CriterionOperator {
    const operator = CriterionOperatorRegistry.get(CRITERION_OPERATOR_IDS.Wildcard);
    if (operator == null) {
        throw new Error('The wildcard operator is not registered.');
    }

    return operator;
}

describe('CriterionVerdict', () => {
    test('passes_WhenTheOperatorMatches_ShouldPass', () => {
        // Arrange
        const options = {
            field: aField(),
            operator: wildcardOperator(),
            criterion: aCriterion({ value: API_PATTERN }),
            values: [API_URL],
        };

        // Act
        const passes = CriterionVerdict.passes(options);

        // Assert
        expect(passes).toBe(true);
    });

    test('passes_WhenTheOperatorDoesNotMatch_ShouldNotPass', () => {
        // Arrange
        const options = {
            field: aField(),
            operator: wildcardOperator(),
            criterion: aCriterion({ value: API_PATTERN }),
            values: [HOME_URL],
        };

        // Act
        const passes = CriterionVerdict.passes(options);

        // Assert
        expect(passes).toBe(false);
    });

    test.each([
        [
            API_URL,
            false,
        ],
        [
            HOME_URL,
            true,
        ],
    ])('passes_WhenTheCriterionIsNegatedAndTheValueIs(%s)_ShouldReturn(%s)', (value, expected) => {
        // Arrange
        const options = {
            field: aField(),
            operator: wildcardOperator(),
            criterion: aCriterion({
                value: API_PATTERN,
                negate: true,
            }),
            values: [value],
        };

        // Act
        const passes = CriterionVerdict.passes(options);

        // Assert
        expect(passes).toBe(expected);
    });

    test.each([
        [
            true,
            true,
        ],
        [
            false,
            false,
        ],
    ])('passes_WhenTheFieldCaseInsensitivityIs(%s)AndTheCaseDiffers_ShouldReturn(%s)', (
        isCaseInsensitive,
        expected,
    ) => {
        // Arrange
        const options = {
            field: aField({ isCaseInsensitive }),
            operator: wildcardOperator(),
            criterion: aCriterion({ value: '*/API/*' }),
            values: [API_URL],
        };

        // Act
        const passes = CriterionVerdict.passes(options);

        // Assert
        expect(passes).toBe(expected);
    });

    test('passes_WhenTheFieldHasItsOwnExpectation_ShouldTestAgainstItInsteadOfTheValue', () => {
        // Arrange
        const options = {
            field: aField({
                expectedOf: () => API_PATTERN,
            }),
            operator: wildcardOperator(),
            criterion: aCriterion({ value: 'users' }),
            values: [API_URL],
        };

        // Act
        const passes = CriterionVerdict.passes(options);

        // Assert
        expect(passes).toBe(true);
    });
});
