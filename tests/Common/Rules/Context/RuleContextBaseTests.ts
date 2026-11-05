import { describe, expect, test } from "vitest";
import { aRuleContext } from "../../../TestData";

describe("RuleContextBase", () => {
    test("render_WhenTextHasVariables_ShouldUseContextVariables", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("token", "abc");

        // Act
        const rendered = context.render("Bearer {{token}} {{missing}}");

        // Assert
        expect(rendered).toBe("Bearer abc {{missing}}");
    });

    test("random_WhenCalled_ShouldReturnFractionBelowOne", () => {
        // Arrange
        const context = aRuleContext();

        // Act
        const value = context.random();

        // Assert
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
    });
});
