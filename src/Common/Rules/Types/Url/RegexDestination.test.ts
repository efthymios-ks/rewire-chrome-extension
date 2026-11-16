import { describe, expect, test } from 'vitest';
import { RegexDestination } from './RegexDestination';
import { REGEX_DESTINATION_MESSAGES } from './RegexDestinationMessages';
import { aCriterion, criteriaOf, TEST_URLS } from '../../../../TestData';

const USERS_REGEX = '^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$';

const REGEX_CRITERIA = criteriaOf(aCriterion({
    op: 'regex',
    value: USERS_REGEX,
}));

describe('RegexDestination', () => {
    test.each([
        [
            'http://localhost:5000/users/$1',
            true,
        ],
        [
            'http://localhost:5000/users',
            false,
        ],
        [
            'http://localhost:5000/price$$',
            false,
        ],
    ])('usesGroups_WhenTheTargetIs(%s)_ShouldReturn(%s)', (target, expected) => {
        // Arrange
        const destination = target;

        // Act
        const usesGroups = RegexDestination.usesGroups(destination);

        // Assert
        expect(usesGroups).toBe(expected);
    });

    test('groupSourceOf_WhenTheRegexConditionIsNegated_ShouldIgnoreIt', () => {
        // Arrange
        const criteria = criteriaOf(aCriterion({
            op: 'regex',
            value: USERS_REGEX,
            negate: true,
        }));

        // Act
        const source = RegexDestination.groupSourceOf(criteria);

        // Assert
        expect(source).toBeNull();
    });

    test('groupErrorsOf_WhenGroupsHaveNoRegexCondition_ShouldAskForOne', () => {
        // Arrange
        const criteria = criteriaOf(aCriterion());

        // Act
        const errors = RegexDestination.groupErrorsOf('http://localhost:5000/users/$1', criteria);

        // Assert
        expect(errors).toEqual([REGEX_DESTINATION_MESSAGES.GroupsNeedRegex]);
    });

    test('groupErrorsOf_WhenTheTargetUsesAGroupTheRegexLacks_ShouldFail', () => {
        // Arrange
        const target = 'http://localhost:5000/users/$2';

        // Act
        const errors = RegexDestination.groupErrorsOf(target, REGEX_CRITERIA);

        // Assert
        expect(errors).toHaveLength(1);
    });

    test('groupErrorsOf_WhenTheTargetHasNoGroups_ShouldPass', () => {
        // Arrange
        const criteria = criteriaOf();

        // Act
        const errors = RegexDestination.groupErrorsOf('http://localhost:5000/users', criteria);

        // Assert
        expect(errors).toEqual([]);
    });

    test('resolve_WhenTheRegexMatches_ShouldInsertTheGroups', () => {
        // Arrange
        const target = 'http://localhost:5000/users/$1';

        // Act
        const url = RegexDestination.resolve({
            url: TEST_URLS.UsersProfile,
            target,
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(url).toBe('http://localhost:5000/users/42');
    });

    test('resolve_WhenTheUrlDiffersOnlyInCase_ShouldStillInsertTheGroups', () => {
        // Arrange
        const target = 'http://localhost:5000/users/$1';

        // Act
        const url = RegexDestination.resolve({
            url: TEST_URLS.UsersProfile.replace('/users/', '/Users/'),
            target,
            criteria: REGEX_CRITERIA,
        });

        // Assert
        expect(url).toBe('http://localhost:5000/users/42');
    });

    test('resolve_WhenTheRegexMisses_ShouldReturnNull', () => {
        // Arrange
        const target = 'http://localhost:5000/users/$1';

        // Act
        const url = RegexDestination.resolve({ url: TEST_URLS.Orders, target, criteria: REGEX_CRITERIA });

        // Assert
        expect(url).toBeNull();
    });

    test('resolve_WhenTheTargetHasNoGroups_ShouldReturnItAsIs', () => {
        // Arrange
        const target = 'http://localhost:5000/users';

        // Act
        const url = RegexDestination.resolve({
            url: TEST_URLS.Orders,
            target,
            criteria: criteriaOf(),
        });

        // Assert
        expect(url).toBe(target);
    });
});
