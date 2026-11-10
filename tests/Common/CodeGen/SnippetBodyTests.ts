import { describe, expect, test } from "vitest";
import { SnippetBodies, SnippetBodyKind } from "../../../src/Common/CodeGen/SnippetBody";

describe("SnippetBodies", () => {
    test.each([
        [
            "empty text",
            SnippetBodies.text(""),
        ],
        [
            "no multipart parts",
            SnippetBodies.multipart([]),
        ],
    ])("hasBody_WhenTheBodyIs(%s)_ShouldReturnFalse", (_case, body) => {
        // Arrange
        const value = body;

        // Act
        const hasBody = SnippetBodies.hasBody(value);

        // Assert
        expect(hasBody).toBe(false);
        expect(value.kind).toBe(SnippetBodyKind.None);
    });

    test("filePart_WhenBuilt_ShouldHoldTheFileAndNoValue", () => {
        // Arrange
        const name = "avatar";

        // Act
        const part = SnippetBodies.filePart(
            name,
            "photo.png",
            "image/png"
        );

        // Assert
        expect(part).toEqual({
            name,
            value: "",
            fileName: "photo.png",
            contentType: "image/png",
        });
    });
});
