import { describe, expect, test } from "vitest";
import { CriteriaEvaluator, CriteriaOutcome } from "../../../../src/Common/Rules/Criteria/CriteriaEvaluator";
import { CriterionStage } from "../../../../src/Common/Rules/Criteria/CriterionStage";
import type { MatchFacts } from "../../../../src/Common/Rules/Drafts/Drafts";
import { CriteriaMatches, CriterionFieldIds, CriterionOperatorIds, type RuleCriteria } from "../../../../src/Contracts/Rules/Criterion";
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext } from "../../../TestData";

const RequestFacts: MatchFacts = {
    request: aRequestDraft(),
    response: null,
};

const PostMethod = aCriterion({
    field: CriterionFieldIds.Method,
    op: CriterionOperatorIds.OneOf,
    value: "POST",
});

const ServerErrorStatus = aCriterion({
    field: CriterionFieldIds.ResponseStatus,
    op: CriterionOperatorIds.Range,
    value: "5xx",
});

describe("CriteriaEvaluator", () => {
    test("evaluate_WhenAllItemsMatch_ShouldMatch", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion(),
                aCriterion({
                    field: CriterionFieldIds.Method,
                    op: CriterionOperatorIds.OneOf,
                    value: "get, post",
                }),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            RequestFacts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.Matched);
        expect(evaluation.results.map(result => result.passed)).toEqual([
            true,
            true,
        ]);
    });

    test("evaluate_WhenOneItemFailsUnderAll_ShouldNotMatch", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion(),
                PostMethod,
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            RequestFacts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.NotMatched);
        expect(evaluation.results[1]).toEqual({
            label: "Method is one of POST",
            passed: false,
            actual: "GET",
        });
    });

    test("evaluate_WhenAnyItemMatches_ShouldMatch", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.Any,
            items: [
                PostMethod,
                aCriterion(),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            RequestFacts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.Matched);
    });

    test.each([
        CriteriaMatches.All,
        CriteriaMatches.Any,
    ])("evaluate_WhenItemsAreEmptyUnder(%s)_ShouldMatch", match => {
        // Arrange
        const criteria: RuleCriteria = {
            match,
            items: [],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            RequestFacts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.Matched);
    });

    test("evaluate_WhenResponseFieldAndNoResponseYet_ShouldDefer", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                PostMethod,
                ServerErrorStatus,
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            RequestFacts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.Deferred);
        expect(evaluation.results[1]).toEqual({
            label: "Response status is in range 5xx",
            passed: null,
            actual: "known after the response",
        });
    });

    test("evaluate_WhenResponseIsKnown_ShouldEvaluateResponseFields", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [ServerErrorStatus],
        };
        const facts: MatchFacts = {
            request: aRequestDraft(),
            response: aResponseDraft({
                status: 503,
            }),
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            facts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.Matched);
        expect(evaluation.results[0]?.actual).toBe("503");
    });

    test("evaluate_WhenItemIsNegated_ShouldInvertTheResult", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion({
                    negate: true,
                }),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            RequestFacts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.NotMatched);
        expect(evaluation.results[0]?.label).toBe("NOT (URL matches wildcard */api/v1/users/*)");
    });

    test("evaluate_WhenFieldIsUnknownOrValueIsMissing_ShouldFailWithExplanation", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.Any,
            items: [
                aCriterion({
                    field: "referrer",
                }),
                aCriterion({
                    field: CriterionFieldIds.RequestHeader,
                    op: CriterionOperatorIds.Exists,
                    name: "X-Missing",
                }),
            ],
        };

        // Act
        const evaluation = CriteriaEvaluator.evaluate(
            criteria,
            RequestFacts,
            aRuleContext()
        );

        // Assert
        expect(evaluation.outcome).toBe(CriteriaOutcome.NotMatched);
        expect(evaluation.results.map(result => result.actual)).toEqual([
            "unknown field or operator",
            "(none)",
        ]);
    });

    test("describe_WhenOperatorNeedsNoValue_ShouldOmitValueAndQuoteName", () => {
        // Arrange
        const criterion = aCriterion({
            field: CriterionFieldIds.Query,
            op: CriterionOperatorIds.Exists,
            name: "debug",
            value: "ignored",
        });

        // Act
        const text = CriteriaEvaluator.describe(criterion);

        // Assert
        expect(text).toBe("Query parameter \"debug\" exists");
    });

    test("describe_WhenFieldAndOperatorAreUnknown_ShouldFallBackToIds", () => {
        // Arrange
        const criterion = aCriterion({
            field: "referrer",
            op: "startsWith",
            value: "https://",
        });

        // Act
        const text = CriteriaEvaluator.describe(criterion);

        // Assert
        expect(text).toBe("referrer startsWith https://");
    });

    test.each([
        [
            "FieldIsUnknown",
            aCriterion({
                field: "referrer",
            }),
            "Unknown criterion \"referrer\".",
        ],
        [
            "OperatorDoesNotFitField",
            aCriterion({
                op: CriterionOperatorIds.Range,
            }),
            "URL can't use \"range\".",
        ],
        [
            "NameIsBlank",
            aCriterion({
                field: CriterionFieldIds.RequestHeader,
                op: CriterionOperatorIds.Wildcard,
                name: " ",
            }),
            "Request header needs a name.",
        ],
        [
            "ValueIsBlank",
            aCriterion({
                value: "  ",
            }),
            "URL needs a value.",
        ],
        [
            "RegexIsInvalid",
            aCriterion({
                op: CriterionOperatorIds.Regex,
                value: "(",
            }),
            "URL regex is invalid:",
        ],
    ])("validate_When%s_ShouldReportOneError", (
        _case,
        criterion,
        expectedMessage
    ) => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [criterion],
        };

        // Act
        const errors = CriteriaEvaluator.validate(criteria);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(expectedMessage);
    });

    test("validate_WhenCriteriaAreComplete_ShouldReportNothing", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.All,
            items: [
                aCriterion(),
                aCriterion({
                    field: CriterionFieldIds.Query,
                    op: CriterionOperatorIds.Exists,
                    name: "debug",
                    value: "",
                }),
                aCriterion({
                    op: CriterionOperatorIds.Regex,
                    value: "^https://api\\.example\\.com/(?P<id>\\d+)$",
                }),
            ],
        };

        // Act
        const errors = CriteriaEvaluator.validate(criteria);

        // Assert
        expect(errors).toEqual([]);
    });

    test("hasStage_WhenAnyItemReadsTheResponse_ShouldReportResponseStage", () => {
        // Arrange
        const criteria: RuleCriteria = {
            match: CriteriaMatches.Any,
            items: [
                aCriterion(),
                ServerErrorStatus,
            ],
        };

        // Act
        const hasResponse = CriteriaEvaluator.hasStage(criteria, CriterionStage.Response);
        const hasStatic = CriteriaEvaluator.hasStage(criteria, CriterionStage.Static);

        // Assert
        expect(hasResponse).toBe(true);
        expect(hasStatic).toBe(false);
    });
});
