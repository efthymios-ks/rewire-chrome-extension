import { describe, expect, test } from "vitest";
import { QueryString } from "../../../src/Common/Urls/QueryString";

describe("QueryString", () => {
    test("keysOf_WhenKeysRepeatAndAreEncoded_ShouldReturnEachDecodedKeyOnce", () => {
        // Arrange
        const url = "https://api.example.com/users?tag=a&tag=b&first%20name=Ada&flag#top";

        // Act
        const keys = QueryString.keysOf(url);

        // Assert
        expect(keys).toEqual([
            "tag",
            "first name",
            "flag",
        ]);
    });

    test("keysOf_WhenThereIsNoQuery_ShouldReturnNothing", () => {
        // Arrange
        const url = "https://api.example.com/users#top?tag=a";

        // Act
        const keys = QueryString.keysOf(url);

        // Assert
        expect(keys).toEqual([]);
    });

    test("without_WhenKeysAreLeftOut_ShouldKeepTheOtherPairsAsWritten", () => {
        // Arrange
        const url = "https://api.example.com/users?tag=a&q=hello+world&tag=b&page=2#top";

        // Act
        const kept = QueryString.without(url, ["tag"]);

        // Assert
        expect(kept).toBe("https://api.example.com/users?q=hello+world&page=2#top");
    });

    test("without_WhenEveryKeyIsLeftOut_ShouldDropTheQuestionMark", () => {
        // Arrange
        const url = "https://api.example.com/users?tag=a#top";

        // Act
        const kept = QueryString.without(url, ["tag"]);

        // Assert
        expect(kept).toBe("https://api.example.com/users#top");
    });

    test("without_WhenNoKeyIsLeftOut_ShouldReturnTheUrlUnchanged", () => {
        // Arrange
        const url = "https://api.example.com/users?a=%zz&b=1";

        // Act
        const kept = QueryString.without(url, []);

        // Assert
        expect(kept).toBe(url);
    });

    test("without_WhenAKeyIsBadlyEncoded_ShouldCompareItAsWritten", () => {
        // Arrange
        const url = "https://api.example.com/users?a%zz=1&b=2";

        // Act
        const kept = QueryString.without(url, ["a%zz"]);

        // Assert
        expect(kept).toBe("https://api.example.com/users?b=2");
    });
});
