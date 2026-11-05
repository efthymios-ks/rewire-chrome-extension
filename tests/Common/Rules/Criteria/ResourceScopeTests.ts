import { describe, expect, test } from "vitest";
import { ResourceScope } from "../../../../src/Common/Rules/Criteria/ResourceScope";
import { CriteriaMatches, CriterionFieldIds, CriterionOperatorIds, type RuleCriteria } from "../../../../src/Contracts/Rules/Criterion";
import { aCriterion } from "../../../TestData";

function typedCriteria(value: string, isNegated: boolean = false): RuleCriteria {
    return {
        match: CriteriaMatches.All,
        items: [
            aCriterion(),
            aCriterion({
                field: CriterionFieldIds.ResourceType,
                op: CriterionOperatorIds.OneOf,
                value,
                negate: isNegated,
            }),
        ],
    };
}

const UntypedCriteria: RuleCriteria = {
    match: CriteriaMatches.All,
    items: [aCriterion()],
};

describe("ResourceScope", () => {
    test("hasExplicitTypes_WhenRuleNamesResourceTypes_ShouldReturnTrue", () => {
        // Arrange
        const criteria = typedCriteria("script");

        // Act
        const typed = ResourceScope.hasExplicitTypes(criteria);
        const untyped = ResourceScope.hasExplicitTypes(UntypedCriteria);

        // Assert
        expect(typed).toBe(true);
        expect(untyped).toBe(false);
    });

    test.each([
        [
            "XHR",
            true,
        ],
        [
            "Fetch",
            true,
        ],
        [
            "Script",
            false,
        ],
        [
            "Document",
            true,
        ],
    ])("allows_WhenRuleNamesNoTypesAndRequestIs(%s)_ShouldReturn(%s)", (debuggerType, expected) => {
        // Arrange
        const criteria = UntypedCriteria;

        // Act
        const isAllowed = ResourceScope.allows(criteria, debuggerType);

        // Assert
        expect(isAllowed).toBe(expected);
    });

    test("allows_WhenRuleNamesTypes_ShouldLeaveFilteringToTheCriteria", () => {
        // Arrange
        const criteria = typedCriteria("fetch");

        // Act
        const isAllowed = ResourceScope.allows(criteria, "Script");

        // Assert
        expect(isAllowed).toBe(true);
    });

    test("debuggerTypesOf_WhenRuleNamesNoTypes_ShouldReturnDefaultScopeCopy", () => {
        // Arrange
        const first = ResourceScope.debuggerTypesOf(UntypedCriteria);
        first?.push("Script");

        // Act
        const second = ResourceScope.debuggerTypesOf(UntypedCriteria);

        // Assert
        expect(second).toEqual([
            "XHR",
            "Fetch",
            "Document",
        ]);
    });

    test("debuggerTypesOf_WhenMatchAllNamesTypes_ShouldReturnEachTypeOnce", () => {
        // Arrange
        const criteria = typedCriteria("fetch,document,fetch");

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toEqual([
            "Fetch",
            "XHR",
            "Document",
        ]);
    });

    test("debuggerTypesOf_WhenTypeItemIsNegated_ShouldReturnNull", () => {
        // Arrange
        const criteria = typedCriteria("image", true);

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toBeNull();
    });

    test("debuggerTypesOf_WhenMatchIsAny_ShouldReturnNull", () => {
        // Arrange
        const criteria: RuleCriteria = {
            ...typedCriteria("script"),
            match: CriteriaMatches.Any,
        };

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toBeNull();
    });

    test("debuggerTypesOf_WhenValueUsesCapitalsOrSpaces_ShouldReadItLikeTheCriterionDoes", () => {
        // Arrange
        const criteria = typedCriteria("Fetch XHR");

        // Act
        const types = ResourceScope.debuggerTypesOf(criteria);

        // Assert
        expect(types).toEqual([
            "Fetch",
            "XHR",
        ]);
    });
});
