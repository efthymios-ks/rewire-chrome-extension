import type { Protocol } from "devtools-protocol";
import { describe, expect, test, vi } from "vitest";
import { DebuggerSessions } from "../../../../src/Background/Features/Debugging/DebuggerSessions";
import { ChildSessionAttachedHandler } from "../../../../src/Background/Features/Sessions/ChildSessionAttachedHandler";
import { Result } from "../../../../src/Common/Results/Result";
import { createDebuggerClientMock, createLogger } from "../../BackgroundTestData";

function anAttachedEvent(waitingForDebugger: boolean): Protocol.Target.AttachedToTargetEvent {
    return {
        sessionId: "session-a",
        targetInfo: {
            targetId: "iframe-1",
            type: "iframe",
            title: "",
            url: "https://widget.example.com/embed",
            attached: true,
            canAccessOpener: false,
        },
        waitingForDebugger,
    };
}

function setUp(prepared: Result<void>) {
    const debuggerMock = createDebuggerClientMock();
    const sessions = new DebuggerSessions();
    const preparer = {
        prepare: vi.fn().mockResolvedValue(prepared),
    };
    const logger = createLogger();
    const handler = new ChildSessionAttachedHandler({
        debuggerClient: debuggerMock.client,
        sessions,
        preparer,
        logger,
    });

    return {
        sendToSession: vi.mocked(debuggerMock.client.sendToSession),
        sessions,
        preparer,
        logger,
        handler,
    };
}

describe("ChildSessionAttachedHandler", () => {
    test("handle_WhenAnIframeWaits_ShouldPrepareItThenLetItRun", async () => {
        // Arrange
        const { sendToSession, sessions, preparer, handler } = setUp(Result.done());

        // Act
        await handler.handle(1, anAttachedEvent(true));

        // Assert
        expect(sessions.childrenOf(1)).toEqual(["session-a"]);
        expect(preparer.prepare).toHaveBeenCalledWith(1, "session-a");
        expect(sendToSession).toHaveBeenCalledWith(
            1,
            "session-a",
            "Runtime.runIfWaitingForDebugger"
        );
    });

    test("handle_WhenPreparingFails_ShouldWarnAndStillLetItRun", async () => {
        // Arrange
        const { sendToSession, logger, handler } = setUp(Result.fail("Network.enable failed: closed"));

        // Act
        await handler.handle(1, anAttachedEvent(true));

        // Assert
        expect(logger.warn).toHaveBeenCalledWith("Capturing the iframe https://widget.example.com/embed failed.", "Network.enable failed: closed");
        expect(sendToSession).toHaveBeenCalledWith(
            1,
            "session-a",
            "Runtime.runIfWaitingForDebugger"
        );
    });

    test("handle_WhenTheIframeIsNotWaiting_ShouldNotResumeIt", async () => {
        // Arrange
        const { sendToSession, handler } = setUp(Result.done());

        // Act
        await handler.handle(1, anAttachedEvent(false));

        // Assert
        expect(sendToSession).not.toHaveBeenCalled();
    });
});
