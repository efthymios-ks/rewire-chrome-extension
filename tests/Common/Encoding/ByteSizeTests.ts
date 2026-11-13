import { describe, expect, test } from "vitest";
import { ByteSize } from "../../../src/Common/Encoding/ByteSize";

describe("ByteSize", () => {
    test("ofText_WhenTheTextHasMultiByteCharacters_ShouldCountUtf8Bytes", () => {
        // Arrange
        const text = "Γειά";

        // Act
        const size = ByteSize.ofText(text);

        // Assert
        expect(size).toBe(8);
    });

    test.each([
        [
            "AAEC",
            3,
        ],
        [
            "AAE=",
            2,
        ],
        [
            "AA==",
            1,
        ],
    ])("ofBase64_WhenTheTextIs(%s)_ShouldCountTheDecodedBytes(%s)", (base64, expected) => {
        // Arrange
        const text = base64;

        // Act
        const size = ByteSize.ofBase64(text);

        // Assert
        expect(size).toBe(expected);
    });
});
