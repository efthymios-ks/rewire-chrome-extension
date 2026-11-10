import { describe, expect, test } from "vitest";
import { SuggestionMatches } from "../../../../src/SidePanel/Core/Dom/SuggestionInput";

const Values = [
    "Accept",
    "Accept-Encoding",
    "Content-Type",
    "X-Accept-Version",
];

describe("SuggestionMatches", () => {
    test("of_WhenTheTextMatchesStartsAndMiddles_ShouldListStartsFirst", () => {
        // Arrange
        const text = "accept";

        // Act
        const matches = SuggestionMatches.of(Values, text);

        // Assert
        expect(matches).toEqual([
            "Accept",
            "Accept-Encoding",
            "X-Accept-Version",
        ]);
    });

    test("of_WhenTheOnlyMatchIsWhatWasTyped_ShouldShowNothing", () => {
        // Arrange
        const text = "content-type";

        // Act
        const matches = SuggestionMatches.of(Values, text);

        // Assert
        expect(matches).toEqual([]);
    });

    test("of_WhenTheTextIsEmpty_ShouldOfferTheFirstEight", () => {
        // Arrange
        const many = Array.from({
            length: 12,
        }, (_value, index) => `Header-${index}`);

        // Act
        const matches = SuggestionMatches.of(many, "");

        // Assert
        expect(matches).toHaveLength(8);
    });
});
