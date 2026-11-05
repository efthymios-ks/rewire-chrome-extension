import { describe, expect, test } from "vitest";
import { HeaderLookup } from "../../../src/Common/Http/HeaderLookup";
import { HeaderText } from "../../../src/Common/Http/HeaderText";
import { TextualMime } from "../../../src/Common/Http/TextualMime";

describe("HeaderText", () => {
    test("parse_WhenLinesHoldNamesAndValues_ShouldSplitAtTheFirstColon", () => {
        // Arrange
        const text = "Accept: application/json\r\n\nX-Time: 10:30\nno colon here\n: empty";

        // Act
        const headers = HeaderText.parse(text);

        // Assert
        expect(headers).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "X-Time",
                value: "10:30",
            },
        ]);
    });

    test("parse_WhenTheNameIsAPseudoHeader_ShouldKeepTheLeadingColon", () => {
        // Arrange
        const text = ":authority: api.example.com";

        // Act
        const headers = HeaderText.parse(text);

        // Assert
        expect(headers).toEqual([
            {
                name: ":authority",
                value: "api.example.com",
            },
        ]);
    });

    test("fromRawRecord_WhenAValueHoldsLineBreaks_ShouldSplitIntoSeveralHeaders", () => {
        // Arrange
        const record = {
            "set-cookie": "a=1; Path=/\nb=2; HttpOnly",
            "content-type": "application/json",
        };

        // Act
        const headers = HeaderLookup.fromRawRecord(record);

        // Assert
        expect(headers).toEqual([
            {
                name: "set-cookie",
                value: "a=1; Path=/",
            },
            {
                name: "set-cookie",
                value: "b=2; HttpOnly",
            },
            {
                name: "content-type",
                value: "application/json",
            },
        ]);
    });
});

describe("TextualMime", () => {
    test.each([
        [
            "application/json; charset=utf-8",
            true,
        ],
        [
            "text/html",
            true,
        ],
        [
            "application/problem+xml",
            true,
        ],
        [
            "image/png",
            false,
        ],
        [
            "",
            false,
        ],
    ])("isTextual_WhenTheMimeTypeIs(%s)_ShouldReturn(%s)", (mimeType, expected) => {
        // Arrange
        const input = mimeType;

        // Act
        const isTextual = TextualMime.isTextual(input);

        // Assert
        expect(isTextual).toBe(expected);
    });
});
