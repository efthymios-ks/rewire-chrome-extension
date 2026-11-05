import { describe, expect, test } from "vitest";
import { RegexStructureAnalyzer } from "../../../src/Common/Regex/RegexStructureAnalyzer";

describe("RegexStructureAnalyzer", () => {
    test("analyze_WhenRegexMixesGroupKinds_ShouldCountCapturingGroupsOnly", () => {
        // Arrange
        const pattern = "^/users/(\\d+)/(?:posts/)?(?P<slug>\\w+)?(?<tab>\\w+)$";

        // Act
        const structure = RegexStructureAnalyzer.analyze(pattern);

        // Assert
        expect(structure.hasErrors).toBe(false);
        expect(structure.hasErrors ? 0 : structure.value.captureGroupCount).toBe(3);
    });

    test("analyze_WhenTheyAreEscapedOrInsideCharacterClasses_ShouldIgnoreParentheses", () => {
        // Arrange
        const pattern = "\\(\\d+\\)[()\\]]+(x)[[:alpha:]]";

        // Act
        const structure = RegexStructureAnalyzer.analyze(pattern);

        // Assert
        expect(structure.hasErrors ? -1 : structure.value.captureGroupCount).toBe(1);
    });

    test("analyze_WhenGroupsAreFollowedByQuestionStarOrZeroMinimum_ShouldMarkOptionalQuantifiers", () => {
        // Arrange
        const pattern = "(a)?(b)*(c){0,2}(d)+(e){1,}";

        // Act
        const structure = RegexStructureAnalyzer.analyze(pattern);

        // Assert
        const optionalByGroup = structure.hasErrors
            ? []
            : structure.value.frames
                .filter(frame => frame.captureIndex !== null)
                .map(frame => frame.quantifier?.isOptional ?? false);
        expect(optionalByGroup).toEqual([
            true,
            true,
            true,
            false,
            false,
        ]);
    });

    test("analyze_WhenPipeSitsAtTheLevel_ShouldFlagAlternation", () => {
        // Arrange
        const pattern = "(a)|b";

        // Act
        const structure = RegexStructureAnalyzer.analyze(pattern);

        // Assert
        const root = structure.hasErrors ? undefined : structure.value.frames[0];
        expect(root?.hasAlternation).toBe(true);
    });

    test.each([
        [
            "(abc",
            "Unclosed",
        ],
        [
            "abc)",
            "Unmatched",
        ],
        [
            "[abc",
            "character class",
        ],
    ])("analyze_WhenRegexIs(%s)_ShouldFail", (pattern, expectedMessage) => {
        // Arrange
        const malformedPattern = pattern;

        // Act
        const structure = RegexStructureAnalyzer.analyze(malformedPattern);

        // Assert
        expect(structure.hasErrors).toBe(true);
        expect(structure.hasErrors ? structure.error : "").toContain(expectedMessage);
    });
});
