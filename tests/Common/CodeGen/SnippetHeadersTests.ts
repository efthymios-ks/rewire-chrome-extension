import { describe, expect, test } from "vitest";
import { SnippetHeaders } from "../../../src/Common/CodeGen/SnippetHeaders";

const Headers = [
    {
        name: ":authority",
        value: "api.example.com",
    },
    {
        name: "Host",
        value: "api.example.com",
    },
    {
        name: "Content-Length",
        value: "13",
    },
    {
        name: "Accept",
        value: "*/*",
    },
    {
        name: "X-Tenant",
        value: "blue",
    },
];

describe("SnippetHeaders", () => {
    test("sendable_WhenTransportAndPseudoHeadersWereCaptured_ShouldLeaveThemOut", () => {
        // Arrange
        const headers = Headers;

        // Act
        const sendable = SnippetHeaders.sendable(headers);

        // Assert
        expect(sendable.map(header => header.name)).toEqual([
            "Accept",
            "X-Tenant",
        ]);
    });

    test("find_WhenTheNameDiffersInCase_ShouldStillFindTheHeader", () => {
        // Arrange
        const name = "x-tenant";

        // Act
        const header = SnippetHeaders.find(Headers, name);

        // Assert
        expect(header?.value).toBe("blue");
    });

    test("without_WhenGivenNames_ShouldDropThoseHeaders", () => {
        // Arrange
        const names = [
            "accept",
            "host",
        ];

        // Act
        const kept = SnippetHeaders.without(Headers, names);

        // Assert
        expect(kept.map(header => header.name)).toEqual([
            ":authority",
            "Content-Length",
            "X-Tenant",
        ]);
    });
});
