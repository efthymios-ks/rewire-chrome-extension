import { describe, expect, test, vi } from "vitest";
import type { ISessionStep } from "../../../../src/Background/Features/Sessions/ISessionStep";
import { SessionPreparer } from "../../../../src/Background/Features/Sessions/SessionPreparer";
import { Result } from "../../../../src/Common/Results/Result";
import { createLogger } from "../../BackgroundTestData";

function aStep(
    name: string,
    isRequired: boolean,
    result: Result<void>
): ISessionStep {
    return {
        name,
        isRequired,
        apply: vi.fn().mockResolvedValue(result),
    };
}

describe("SessionPreparer", () => {
    test("prepare_WhenARequiredStepFails_ShouldStopAndReturnItsError", async () => {
        // Arrange
        const network = aStep(
            "Network capture",
            true,
            Result.fail("Network.enable failed: closed")
        );
        const later = aStep(
            "Later",
            true,
            Result.done()
        );
        const preparer = new SessionPreparer(
            [
                network,
                later,
            ],
            createLogger()
        );

        // Act
        const result = await preparer.prepare(1, "session-a");

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "Network.enable failed: closed",
        });
        expect(later.apply).not.toHaveBeenCalled();
    });

    test("prepare_WhenAnOptionalStepFails_ShouldWarnAndGoOn", async () => {
        // Arrange
        const logger = createLogger();
        const frames = aStep(
            "Cross-origin iframes",
            false,
            Result.fail("Target.setAutoAttach failed: not allowed")
        );
        const later = aStep(
            "Later",
            true,
            Result.done()
        );
        const preparer = new SessionPreparer(
            [
                frames,
                later,
            ],
            logger
        );

        // Act
        const result = await preparer.prepare(1, null);

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(later.apply).toHaveBeenCalledWith(1, null);
        expect(logger.warn).toHaveBeenCalledWith("Cross-origin iframes isn't available on tab 1.", "Target.setAutoAttach failed: not allowed");
    });
});
