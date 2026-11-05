import { describe, expect, test } from "vitest";
import type { Result } from "../../../src/Common/Results/Result";
import { RegexStructureAnalyzer } from "../../../src/Common/Regex/RegexStructureAnalyzer";
import { StrictGroupRewriter } from "../../../src/Common/Regex/StrictGroupRewriter";

function rewrite(pattern: string, groupIndexes: number[]): Result<string> {
    const structure = RegexStructureAnalyzer.analyze(pattern);
    if (structure.hasErrors) {
        return structure;
    }

    return StrictGroupRewriter.rewrite(
        pattern,
        structure.value,
        groupIndexes
    );
}

describe("StrictGroupRewriter", () => {
    test.each([
        [
            "/users/(\\d+)?/profile",
            "/users/(\\d+)/profile",
        ],
        [
            "/users/(\\d+)??/profile",
            "/users/(\\d+)/profile",
        ],
        [
            "/tags/(\\w)*",
            "/tags/(\\w)+",
        ],
        [
            "/tags/(\\w)*?",
            "/tags/(\\w)+?",
        ],
        [
            "/ids(?:/(\\d+)){0,3}",
            "/ids(?:/(\\d+)){1,3}",
        ],
        [
            "/users(?:/(\\d+))?/profile",
            "/users(?:/(\\d+))/profile",
        ],
    ])("rewrite_WhenRegexIs(%s)_ShouldMakeTheGroupMandatory", (pattern, expected) => {
        // Arrange
        const groupIndexes = [1];

        // Act
        const rewritten = rewrite(pattern, groupIndexes);

        // Assert
        expect(rewritten.hasErrors ? rewritten.error : rewritten.value).toBe(expected);
    });

    test("rewrite_WhenTheyAreNotReferenced_ShouldLeaveOtherGroupsOptional", () => {
        // Arrange
        const pattern = "(a)?(b)?";

        // Act
        const rewritten = rewrite(pattern, [2]);

        // Assert
        expect(rewritten.hasErrors ? rewritten.error : rewritten.value).toBe("(a)?(b)");
    });

    test("rewrite_WhenGroupSitsInsideAnAlternation_ShouldFail", () => {
        // Arrange
        const pattern = "/users/(?:me|(\\d+))";

        // Act
        const rewritten = rewrite(pattern, [1]);

        // Assert
        expect(rewritten.hasErrors ? rewritten.error : "").toContain("alternation");
    });

    test("rewrite_WhenGroupQuantifierNeverMatches_ShouldFail", () => {
        // Arrange
        const pattern = "/users/(\\d+){0}";

        // Act
        const rewritten = rewrite(pattern, [1]);

        // Assert
        expect(rewritten.hasErrors ? rewritten.error : "").toContain("never matches");
    });

    test("rewrite_WhenGroupDoesNotExist_ShouldFail", () => {
        // Arrange
        const pattern = "/users/(\\d+)";

        // Act
        const rewritten = rewrite(pattern, [2]);

        // Assert
        expect(rewritten.hasErrors ? rewritten.error : "").toContain("no group $2");
    });
});
