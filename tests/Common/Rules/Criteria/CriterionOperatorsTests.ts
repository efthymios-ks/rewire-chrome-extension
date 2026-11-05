import { describe, expect, test } from "vitest";
import { CriterionOperatorRegistry, type ICriterionOperator } from "../../../../src/Common/Rules/Criteria/CriterionOperators";
import { CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";

function operatorOf(id: string): ICriterionOperator {
    const operator = CriterionOperatorRegistry.get(id);
    if (operator === undefined) {
        throw new Error(`Operator "${id}" is not registered.`);
    }

    return operator;
}

describe("CriterionOperators", () => {
    test("get_WhenIdIsUnknown_ShouldReturnUndefined", () => {
        // Arrange
        const id = "startsWith";

        // Act
        const operator = CriterionOperatorRegistry.get(id);

        // Assert
        expect(operator).toBeUndefined();
    });

    test.each([
        [
            "404",
            "404",
            true,
        ],
        [
            "4xx",
            "404",
            true,
        ],
        [
            "4XX",
            "500",
            false,
        ],
        [
            "500-599",
            "503",
            true,
        ],
        [
            "500 - 599",
            "600",
            false,
        ],
        [
            "404, 5xx",
            "502",
            true,
        ],
    ])("test_WhenRangeIs(%s)AndStatusIs(%s)_ShouldReturn(%s)", (
        range,
        status,
        expected
    ) => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.Range);

        // Act
        const isMatch = operator.test([status], range);

        // Assert
        expect(isMatch).toBe(expected);
    });

    test.each([
        [
            "09:00-17:30",
            "09:00",
            true,
        ],
        [
            "09:00-17:30",
            "17:30",
            false,
        ],
        [
            "22:00-02:00",
            "23:15",
            true,
        ],
        [
            "22:00-02:00",
            "01:59",
            true,
        ],
        [
            "22:00-02:00",
            "12:00",
            false,
        ],
        [
            "morning",
            "09:00",
            false,
        ],
    ])("test_WhenWindowIs(%s)AndTimeIs(%s)_ShouldReturn(%s)", (
        window,
        time,
        expected
    ) => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.Between);

        // Act
        const isMatch = operator.test([time], window);

        // Assert
        expect(isMatch).toBe(expected);
    });

    test("test_WhenOneOfListMixesSeparatorsAndCase_ShouldMatchIgnoringCase", () => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.OneOf);

        // Act
        const matchesPost = operator.test(["POST"], " get,Post  put ");
        const matchesDelete = operator.test(["DELETE"], " get,Post  put ");

        // Assert
        expect(matchesPost).toBe(true);
        expect(matchesDelete).toBe(false);
    });

    test("test_WhenExistsGetsAnyValue_ShouldMatchEvenAnEmptyOne", () => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.Exists);

        // Act
        const withEmptyValue = operator.test([""], "");
        const withNoValues = operator.test([], "");

        // Assert
        expect(operator.needsValue).toBe(false);
        expect(withEmptyValue).toBe(true);
        expect(withNoValues).toBe(false);
    });

    test("test_WhenSampleIsBelowPercent_ShouldMatch", () => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.Percent);

        // Act
        const below = operator.test(["9.99"], "10");
        const atLimit = operator.test(["10"], "10");

        // Assert
        expect(below).toBe(true);
        expect(atLimit).toBe(false);
    });

    test("test_WhenHostIsSubdomainOfListedDomain_ShouldMatch", () => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.Domains);

        // Act
        const subdomain = operator.test(["auth.example.com"], "example.com, example.org");
        const lookalike = operator.test(["badexample.com"], "example.com, example.org");

        // Assert
        expect(subdomain).toBe(true);
        expect(lookalike).toBe(false);
    });

    test("test_WhenRegexIsInvalid_ShouldNotMatch", () => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.Regex);

        // Act
        const isMatch = operator.test(["https://api.example.com/("], "(");

        // Assert
        expect(isMatch).toBe(false);
    });

    test("test_WhenAnyValueMatchesWildcard_ShouldMatch", () => {
        // Arrange
        const operator = operatorOf(CriterionOperatorIds.Wildcard);
        const values = [
            "text/html",
            "application/json; charset=utf-8",
        ];

        // Act
        const isMatch = operator.test(values, "application/json*");

        // Assert
        expect(isMatch).toBe(true);
    });
});
