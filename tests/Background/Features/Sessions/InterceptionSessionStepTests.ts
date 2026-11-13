import { describe, expect, test, vi } from "vitest";
import { InterceptionSessionStep } from "../../../../src/Background/Features/Sessions/InterceptionSessionStep";
import { aRule } from "../../../TestData";
import { activeRulesOf, createDebuggerClientMock } from "../../BackgroundTestData";

describe("InterceptionSessionStep", () => {
    test("apply_WhenNoRuleNeedsTheDebugger_ShouldTurnInterceptionOffInThatSession", async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new InterceptionSessionStep(debuggerMock.client, activeRulesOf([]));

        // Act
        await step.apply(1, "session-a");

        // Assert
        expect(debuggerMock.client.sendToSession).toHaveBeenCalledWith(
            1,
            "session-a",
            "Fetch.disable"
        );
    });

    test("apply_WhenARuleNeedsTheDebugger_ShouldTurnInterceptionOnInThatSession", async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new InterceptionSessionStep(debuggerMock.client, activeRulesOf([aRule()]));

        // Act
        await step.apply(1, null);

        // Assert
        const [call] = vi.mocked(debuggerMock.client.sendToSession).mock.calls;
        expect(call?.slice(0, 3)).toEqual([
            1,
            null,
            "Fetch.enable",
        ]);
    });
});
