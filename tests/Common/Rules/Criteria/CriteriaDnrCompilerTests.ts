import { describe, expect, test } from "vitest";
import { CriteriaDnrCompiler } from "../../../../src/Common/Rules/Criteria/CriteriaDnrCompiler";
import { CriteriaMatches, CriterionFieldIds, CriterionOperatorIds, type RuleCriteria } from "../../../../src/Contracts/Rules/Criterion";
import { FixedRuleContext } from "../../../FixedRuleContext";
import { aCriterion, aRuleContext } from "../../../TestData";

const OfficeHours = aCriterion({
    field: CriterionFieldIds.TimeWindow,
    op: CriterionOperatorIds.Between,
    value: "09:00-17:00",
});

const Evening = aCriterion({
    field: CriterionFieldIds.TimeWindow,
    op: CriterionOperatorIds.Between,
    value: "18:00-22:00",
});

const UsersPath = aCriterion({
    field: CriterionFieldIds.Path,
    op: CriterionOperatorIds.Wildcard,
    value: "/api/v1/users",
});

function contextAt(time: string): FixedRuleContext {
    return new FixedRuleContext(new Date(`2026-11-06T${time}:00`));
}

describe("CriteriaDnrCompiler", () => {
    test("staticallyAllows_WhenThereAreNoStaticItems_ShouldAllow", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [aCriterion()],
        };

        // Act
        const isAllowed = CriteriaDnrCompiler.staticallyAllows(criteria, aRuleContext());

        // Assert
        expect(isAllowed).toBe(true);
    });

    test("staticallyAllows_WhenStaticItemFailsUnderAll_ShouldBlock", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion(),
                OfficeHours,
            ],
        };

        // Act
        const early = CriteriaDnrCompiler.staticallyAllows(criteria, contextAt("08:00"));
        const office = CriteriaDnrCompiler.staticallyAllows(criteria, contextAt("10:00"));

        // Assert
        expect(early).toBe(false);
        expect(office).toBe(true);
    });

    test("staticallyAllows_WhenStaticItemFailsUnderAnyWithDynamicItem_ShouldAllow", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.Any,
            items: [
                OfficeHours,
                aCriterion(),
            ],
        };

        // Act
        const isAllowed = CriteriaDnrCompiler.staticallyAllows(criteria, contextAt("08:00"));

        // Assert
        expect(isAllowed).toBe(true);
    });

    test("staticallyAllows_WhenEveryItemIsStaticAndFailsUnderAny_ShouldBlock", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.Any,
            items: [
                OfficeHours,
                Evening,
            ],
        };

        // Act
        const isAllowed = CriteriaDnrCompiler.staticallyAllows(criteria, contextAt("23:00"));

        // Assert
        expect(isAllowed).toBe(false);
    });

    test("compile_WhenMatchAllMixesRegexAndConditionPatches_ShouldMergeIntoOneCondition", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion({
                    value: "https://api.example.com/*",
                }),
                aCriterion({
                    field: CriterionFieldIds.Method,
                    op: CriterionOperatorIds.OneOf,
                    value: "get",
                }),
                aCriterion({
                    field: CriterionFieldIds.Host,
                    op: CriterionOperatorIds.Domains,
                    value: "cdn.example.com",
                    negate: true,
                }),
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, aRuleContext());

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    regexFilter: "^https://api\\.example\\.com/.*$",
                    requestMethods: ["get"],
                    excludedRequestDomains: ["cdn.example.com"],
                },
            ],
        });
    });

    test("compile_WhenMatchAllHasTwoRegexItems_ShouldFail", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion(),
                UsersPath,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, aRuleContext());

        // Assert
        expect(conditions).toEqual({
            hasErrors: true,
            error: "With more than one URL, path, extension, host pattern or query condition the rule works on the inspected tab only.",
        });
    });

    test("compile_WhenMatchAnyHasTwoRegexItems_ShouldReturnOneConditionPerItem", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.Any,
            items: [
                aCriterion({
                    value: "https://api.example.com/*",
                }),
                UsersPath,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, aRuleContext());

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    regexFilter: "^https://api\\.example\\.com/.*$",
                },
                {
                    regexFilter: "^[a-z][a-z0-9+.-]*://[^/?#]+/api/v1/users(?:[?#].*)?$",
                },
            ],
        });
    });

    test.each([
        CriteriaMatches.All,
        CriteriaMatches.Any,
    ])("compile_WhenItemNeedsTheDebuggerUnder(%s)_ShouldFailWithItsReason", match => {
        // Arrange
        const criteria: RuleCriteria = {
            match,
            items: [
                aCriterion(),
                aCriterion({
                    field: CriterionFieldIds.RequestHeader,
                    op: CriterionOperatorIds.Exists,
                    name: "Authorization",
                }),
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, aRuleContext());

        // Assert
        expect(conditions).toEqual({
            hasErrors: true,
            error: "Request header conditions work on the inspected tab only.",
        });
    });

    test("compile_WhenFieldIsUnknown_ShouldFail", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion({
                    field: "referrer",
                }),
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, aRuleContext());

        // Assert
        expect(conditions).toEqual({
            hasErrors: true,
            error: "Unknown criterion \"referrer\".",
        });
    });

    test("compile_WhenStaticItemsBlock_ShouldReturnNoConditions", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion(),
                OfficeHours,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, contextAt("08:00"));

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test("compile_WhenStaticItemPassesUnderAll_ShouldLeaveItOutOfTheCondition", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                OfficeHours,
                UsersPath,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, contextAt("10:00"));

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [
                {
                    regexFilter: "^[a-z][a-z0-9+.-]*://[^/?#]+/api/v1/users(?:[?#].*)?$",
                },
            ],
        });
    });

    test("compile_WhenStaticItemPassesUnderAny_ShouldMatchEveryRequest", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.Any,
            items: [
                Evening,
                aCriterion(),
                UsersPath,
            ],
        };

        // Act
        const conditions = CriteriaDnrCompiler.compile(criteria, contextAt("19:00"));

        // Assert
        expect(conditions).toEqual({
            hasErrors: false,
            value: [{}],
        });
    });
});
