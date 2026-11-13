import { afterEach, describe, expect, test, vi } from "vitest";
import { DebuggerClient } from "../../../../src/Background/Features/Debugging/DebuggerClient";
import { DebuggerSessions } from "../../../../src/Background/Features/Debugging/DebuggerSessions";

function stubChrome() {
    const sendCommand = vi.fn().mockResolvedValue({});
    vi.stubGlobal("chrome", {
        debugger: {
            sendCommand,
        },
    });

    return sendCommand;
}

describe("DebuggerClient", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("send_WhenTheRequestCameFromAnIframe_ShouldSendToThatIframeSession", async () => {
        // Arrange
        const sendCommand = stubChrome();
        const sessions = new DebuggerSessions();
        sessions.remember(
            1,
            "request-1",
            "session-a"
        );
        const client = new DebuggerClient(sessions);

        // Act
        await client.send(
            1,
            "Network.getResponseBody",
            {
                requestId: "request-1",
            }
        );

        // Assert
        expect(sendCommand).toHaveBeenCalledWith(
            {
                tabId: 1,
                sessionId: "session-a",
            },
            "Network.getResponseBody",
            {
                requestId: "request-1",
            }
        );
    });

    test("send_WhenTheRequestCameFromTheTopFrame_ShouldSendToTheTab", async () => {
        // Arrange
        const sendCommand = stubChrome();
        const client = new DebuggerClient(new DebuggerSessions());

        // Act
        await client.send(
            1,
            "Network.getResponseBody",
            {
                requestId: "request-1",
            }
        );

        // Assert
        expect(sendCommand.mock.calls[0]?.[0]).toEqual({
            tabId: 1,
        });
    });

    test("sendToSession_WhenTheCommandFails_ShouldNameTheCommand", async () => {
        // Arrange
        const sendCommand = stubChrome();
        sendCommand.mockRejectedValue(new Error("No target"));
        const client = new DebuggerClient(new DebuggerSessions());

        // Act
        const result = await client.sendToSession(
            1,
            "session-a",
            "Runtime.runIfWaitingForDebugger"
        );

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "Runtime.runIfWaitingForDebugger failed: No target",
        });
    });
});
