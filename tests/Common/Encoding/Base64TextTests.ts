import { describe, expect, test } from "vitest";
import { Base64Text } from "../../../src/Common/Encoding/Base64Text";

describe("Base64Text", () => {
    test("fromUtf8_WhenTextHasNonAsciiCharacters_ShouldRoundTrip", () => {
        // Arrange
        const text = "{\"city\":\"Αθήνα\",\"price\":\"12 €\"}";

        // Act
        const encoded = Base64Text.fromUtf8(text);
        const decoded = Base64Text.toUtf8(encoded);

        // Assert
        expect(decoded).toBe(text);
    });

    test("fromUtf8_WhenTextExceedsOneChunk_ShouldEncodeLargeBodies", () => {
        // Arrange
        const text = "x".repeat(100_000);

        // Act
        const encoded = Base64Text.fromUtf8(text);

        // Assert
        expect(Base64Text.toUtf8(encoded)).toBe(text);
    });

    test("fromUtf8_WhenTextIsAscii_ShouldMatchStandardBase64", () => {
        // Arrange
        const text = "hello";

        // Act
        const encoded = Base64Text.fromUtf8(text);

        // Assert
        expect(encoded).toBe("aGVsbG8=");
    });
    test("fromBytes_WhenGivenBinaryBytes_ShouldMatchStandardBase64", () => {
        // Arrange
        const bytes = new Uint8Array([
            0,
            255,
            128,
            10,
        ]);

        // Act
        const encoded = Base64Text.fromBytes(bytes);

        // Assert
        expect(encoded).toBe("AP+ACg==");
    });
});
