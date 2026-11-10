import { describe, expect, test } from "vitest";
import { DefaultSnippetParts } from "../../../../src/Common/CodeGen/RequestSnapshot";
import { WgetSnippet } from "../../../../src/Common/CodeGen/WgetSnippet";
import { DetailSnippets } from "../../../../src/SidePanel/Features/Inspector/DetailSnippets";
import { aDetail, aSummary } from "../../../TestData";

describe("DetailSnippets", () => {
    test("snapshotOf_WhenGivenADetail_ShouldTakeTheRequestAsSentAfterRules", () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                method: "PUT",
                url: "https://api.example.com/users/42",
            }),
            requestBody: "{}",
        });

        // Act
        const snapshot = DetailSnippets.snapshotOf(detail);

        // Assert
        expect(snapshot).toEqual({
            method: "PUT",
            url: "https://api.example.com/users/42",
            headers: detail.requestHeaders,
            body: "{}",
        });
    });

    test("of_WhenGivenASnippetId_ShouldRenderThatFormat", () => {
        // Arrange
        const snapshot = DetailSnippets.snapshotOf(aDetail());

        // Act
        const text = DetailSnippets.of(
            snapshot,
            WgetSnippet.id,
            DefaultSnippetParts
        );

        // Assert
        expect(text).toBe(WgetSnippet.from(snapshot).toString());
    });
});
