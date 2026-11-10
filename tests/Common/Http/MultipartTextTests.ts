import { describe, expect, test } from "vitest";
import { SnippetBodies } from "../../../src/Common/CodeGen/SnippetBody";
import { MultipartText } from "../../../src/Common/Http/MultipartText";

const ContentType = "multipart/form-data; boundary=----Boundary7";

describe("MultipartText", () => {
    test("parse_WhenTheBodyHoldsTextAndFileParts_ShouldReadEachPart", () => {
        // Arrange
        const text = [
            "------Boundary7",
            "Content-Disposition: form-data; name=\"title\"",
            "",
            "Hello",
            "------Boundary7",
            "Content-Disposition: form-data; name=\"avatar\"; filename=\"photo.png\"",
            "Content-Type: image/png",
            "",
            "",
            "------Boundary7--",
            "",
        ].join("\r\n");

        // Act
        const parts = MultipartText.parse(text, ContentType);

        // Assert
        expect(parts).toEqual([
            SnippetBodies.textPart("title", "Hello"),
            SnippetBodies.filePart(
                "avatar",
                "photo.png",
                "image/png"
            ),
        ]);
    });

    test.each([
        [
            "multipart/form-data; boundary=\"quoted\"",
            "quoted",
        ],
        [
            "multipart/form-data;boundary=plain;charset=utf-8",
            "plain",
        ],
        [
            "multipart/form-data",
            null,
        ],
    ])("boundaryOf_WhenTheTypeIs(%s)_ShouldReturn(%s)", (contentType, expected) => {
        // Arrange
        const type = contentType;

        // Act
        const boundary = MultipartText.boundaryOf(type);

        // Assert
        expect(boundary).toBe(expected);
    });

    test("parse_WhenTheBoundaryNeverAppears_ShouldReturnNull", () => {
        // Arrange
        const text = "plain text";

        // Act
        const parts = MultipartText.parse(text, ContentType);

        // Assert
        expect(parts).toBeNull();
    });
});
