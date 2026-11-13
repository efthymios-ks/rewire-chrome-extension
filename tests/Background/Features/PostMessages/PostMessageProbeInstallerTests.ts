import { describe, expect, test, vi } from "vitest";
import type { IDebuggerClient } from "../../../../src/Background/Features/Debugging/IDebuggerClient";
import { PostMessageBindingName, PostMessageProbe } from "../../../../src/Background/Features/PostMessages/PostMessageProbe";
import { PostMessageProbeInstaller } from "../../../../src/Background/Features/PostMessages/PostMessageProbeInstaller";
import { Result } from "../../../../src/Common/Results/Result";
import { createDebuggerClientMock } from "../../BackgroundTestData";

function setUp() {
    const debuggerMock = createDebuggerClientMock();
    const sendToSession = vi.mocked(debuggerMock.client.sendToSession);
    const respond = async (
        _tabId: number,
        _sessionId: string | null,
        command: string
    ): Promise<Result<unknown>> => command === "Page.addScriptToEvaluateOnNewDocument"
        ? Result.ok({
            identifier: "script-1",
        })
        : Result.ok({});
    sendToSession.mockImplementation(respond as unknown as IDebuggerClient["sendToSession"]);

    return {
        sendToSession,
        installer: new PostMessageProbeInstaller(debuggerMock.client),
    };
}

describe("PostMessageProbeInstaller", () => {
    test("install_WhenASessionListens_ShouldAddTheBindingAndTheProbe", async () => {
        // Arrange
        const { sendToSession, installer } = setUp();

        // Act
        const result = await installer.install(7, "session-a");

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(sendToSession.mock.calls.map(call => call.slice(1))).toEqual([
            [
                "session-a",
                "Runtime.enable",
            ],
            [
                "session-a",
                "Runtime.addBinding",
                {
                    name: PostMessageBindingName,
                },
            ],
            [
                "session-a",
                "Page.addScriptToEvaluateOnNewDocument",
                {
                    source: PostMessageProbe.source,
                },
            ],
            [
                "session-a",
                "Runtime.evaluate",
                {
                    expression: PostMessageProbe.source,
                },
            ],
        ]);
    });

    test("install_WhenTheBindingFails_ShouldStopAndReturnTheError", async () => {
        // Arrange
        const { sendToSession, installer } = setUp();
        sendToSession
            .mockResolvedValueOnce(Result.ok({}))
            .mockResolvedValueOnce(Result.fail("Runtime.addBinding failed: closed"));

        // Act
        const result = await installer.install(7, null);

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "Runtime.addBinding failed: closed",
        });
        expect(sendToSession).toHaveBeenCalledTimes(2);
    });

    test("uninstall_WhenListeningStops_ShouldRemoveTheProbeTheBindingAndRuntime", async () => {
        // Arrange
        const { sendToSession, installer } = setUp();
        await installer.install(7, null);
        sendToSession.mockClear();

        // Act
        await installer.uninstall(7, null);

        // Assert
        expect(sendToSession.mock.calls.map(call => call.slice(1))).toEqual([
            [
                null,
                "Page.removeScriptToEvaluateOnNewDocument",
                {
                    identifier: "script-1",
                },
            ],
            [
                null,
                "Runtime.removeBinding",
                {
                    name: PostMessageBindingName,
                },
            ],
            [
                null,
                "Runtime.disable",
            ],
        ]);
    });
});
