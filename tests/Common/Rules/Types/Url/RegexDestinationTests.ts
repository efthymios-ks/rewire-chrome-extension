import { describe, expect, test } from "vitest";
import { RegexDestination, RegexDestinationMessages } from "../../../../../src/Common/Rules/Types/Url/RegexDestination";
import { CriteriaMatches, type RuleCriteria } from "../../../../../src/Contracts/Rules/Criterion";
import { aCriterion, TestUrls } from "../../../../TestData";

const usersRegex = "^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$";

function criteriaOf(...items: RuleCriteria["items"]): RuleCriteria {
    return {
        match: CriteriaMatches.All,
        items,
    };
}

const regexCriteria = criteriaOf(aCriterion({
    op: "regex",
    value: usersRegex,
}));

describe("RegexDestination", () => {
    test.each([
        [
            "http://localhost:5000/users/$1",
            true,
        ],
        [
            "http://localhost:5000/users",
            false,
        ],
        [
            "http://localhost:5000/price$$",
            false,
        ],
    ])("usesGroups_WhenTheTargetIs(%s)_ShouldReturn(%s)", (target, expected) => {
        // Arrange
        const destination = target;

        // Act
        const usesGroups = RegexDestination.usesGroups(destination);

        // Assert
        expect(usesGroups).toBe(expected);
    });

    test("groupSourceOf_WhenTheRegexConditionIsNegated_ShouldIgnoreIt", () => {
        // Arrange
        const criteria = criteriaOf(aCriterion({
            op: "regex",
            value: usersRegex,
            negate: true,
        }));

        // Act
        const source = RegexDestination.groupSourceOf(criteria);

        // Assert
        expect(source).toBeNull();
    });

    test("groupErrorsOf_WhenGroupsHaveNoRegexCondition_ShouldAskForOne", () => {
        // Arrange
        const criteria = criteriaOf(aCriterion());

        // Act
        const errors = RegexDestination.groupErrorsOf("http://localhost:5000/users/$1", criteria);

        // Assert
        expect(errors).toEqual([RegexDestinationMessages.GroupsNeedRegex]);
    });

    test("groupErrorsOf_WhenTheTargetUsesAGroupTheRegexLacks_ShouldFail", () => {
        // Arrange
        const target = "http://localhost:5000/users/$2";

        // Act
        const errors = RegexDestination.groupErrorsOf(target, regexCriteria);

        // Assert
        expect(errors).toHaveLength(1);
    });

    test("groupErrorsOf_WhenTheTargetHasNoGroups_ShouldPass", () => {
        // Arrange
        const criteria = criteriaOf();

        // Act
        const errors = RegexDestination.groupErrorsOf("http://localhost:5000/users", criteria);

        // Assert
        expect(errors).toEqual([]);
    });

    test("resolve_WhenTheRegexMatches_ShouldInsertTheGroups", () => {
        // Arrange
        const target = "http://localhost:5000/users/$1";

        // Act
        const url = RegexDestination.resolve(
            TestUrls.UsersProfile,
            target,
            regexCriteria
        );

        // Assert
        expect(url).toBe("http://localhost:5000/users/42");
    });

    test("resolve_WhenTheRegexMisses_ShouldReturnNull", () => {
        // Arrange
        const target = "http://localhost:5000/users/$1";

        // Act
        const url = RegexDestination.resolve(
            TestUrls.Orders,
            target,
            regexCriteria
        );

        // Assert
        expect(url).toBeNull();
    });

    test("resolve_WhenTheTargetHasNoGroups_ShouldReturnItAsIs", () => {
        // Arrange
        const target = "http://localhost:5000/users";

        // Act
        const url = RegexDestination.resolve(
            TestUrls.Orders,
            target,
            criteriaOf()
        );

        // Assert
        expect(url).toBe(target);
    });
});
