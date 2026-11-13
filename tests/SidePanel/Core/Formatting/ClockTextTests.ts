import { describe, expect, test } from "vitest";
import { ClockText } from "../../../../src/SidePanel/Core/Formatting/ClockText";

describe("ClockText", () => {
    test("of_WhenATimeIsGiven_ShouldShowUtcHoursMinutesAndSeconds", () => {
        // Arrange
        const at = "2026-11-12T09:05:07.042Z";

        // Act
        const text = ClockText.of(at);

        // Assert
        expect(text).toBe("09:05:07");
    });

    test("precise_WhenATimeIsGiven_ShouldAddMilliseconds", () => {
        // Arrange
        const at = "2026-11-12T09:05:07.042Z";

        // Act
        const text = ClockText.precise(at);

        // Assert
        expect(text).toBe("09:05:07.042");
    });

    test("of_WhenTheTimeIsInvalid_ShouldReturnNothing", () => {
        // Arrange
        const at = "soon";

        // Act
        const text = ClockText.of(at);

        // Assert
        expect(text).toBe("");
    });
});
