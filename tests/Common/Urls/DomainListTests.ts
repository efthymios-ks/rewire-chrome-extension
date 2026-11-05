import { describe, expect, test } from "vitest";
import { DomainList } from "../../../src/Common/Urls/DomainList";

describe("DomainList", () => {
    test("parse_WhenTextMixesSeparatorsAndCase_ShouldNormalizeAndDedupe", () => {
        // Arrange
        const text = " API.Example.com, *.auth.example.com;\napi.example.com  .cdn.example.com. ";

        // Act
        const domains = DomainList.parse(text);

        // Assert
        expect(domains).toEqual([
            "api.example.com",
            "auth.example.com",
            "cdn.example.com",
        ]);
    });

    test("parse_WhenTextIsBlank_ShouldReturnEmpty", () => {
        // Arrange
        const text = "  ,  ";

        // Act
        const domains = DomainList.parse(text);

        // Assert
        expect(domains).toEqual([]);
    });

    test("format_WhenDomainsAreGiven_ShouldJoinWithCommas", () => {
        // Arrange
        const domains = [
            "api.example.com",
            "localhost",
        ];

        // Act
        const text = DomainList.format(domains);

        // Assert
        expect(text).toBe("api.example.com, localhost");
    });
});
