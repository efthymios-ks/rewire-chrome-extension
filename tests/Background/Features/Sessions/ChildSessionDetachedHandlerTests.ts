import { describe, expect, test } from "vitest";
import { DebuggerSessions } from "../../../../src/Background/Features/Debugging/DebuggerSessions";
import { ChildSessionDetachedHandler } from "../../../../src/Background/Features/Sessions/ChildSessionDetachedHandler";

describe("ChildSessionDetachedHandler", () => {
    test("handle_WhenAnIframeGoes_ShouldForgetItsSession", async () => {
        // Arrange
        const sessions = new DebuggerSessions();
        sessions.addChild(1, "session-a");
        const handler = new ChildSessionDetachedHandler(sessions);

        // Act
        await handler.handle(
            1,
            {
                sessionId: "session-a",
            }
        );

        // Assert
        expect(sessions.childrenOf(1)).toEqual([]);
    });
});
