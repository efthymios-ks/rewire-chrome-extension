import { describe, expect, test } from "vitest";
import { FormDataContentRule } from "../../../src/Common/Content/FormDataContentRule";

const rule = new FormDataContentRule();

describe("FormDataContentRule", () => {
    test.each([
        [
            "multipart/form-data; boundary=x",
            true,
        ],
        [
            "Application/X-WWW-Form-Urlencoded",
            true,
        ],
        [
            "application/json",
            false,
        ],
        [
            "",
            false,
        ],
    ])("matches_WhenTheRequestTypeIs(%s)_ShouldReturn(%s)", (contentType, expected) => {
        // Arrange
        const signals = {
            url: "https://api.example.com/upload",
            requestContentType: contentType,
            responseMimeType: "",
            requestBody: null,
        };

        // Act
        const matches = rule.matches(signals);

        // Assert
        expect(matches).toBe(expected);
    });
});
