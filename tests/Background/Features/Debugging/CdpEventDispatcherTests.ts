import { describe, expect, test, vi } from "vitest";
import { CdpEventDispatcher } from "../../../../src/Background/Features/Debugging/CdpEventDispatcher";
import { DebuggerSessions } from "../../../../src/Background/Features/Debugging/DebuggerSessions";

function aHandler() {
    return {
        event: "Network.loadingFinished" as const,
        handle: vi.fn().mockResolvedValue(undefined),
    };
}

describe("CdpEventDispatcher", () => {
    test("dispatch_WhenAnIframeSessionReportsARequest_ShouldRememberItsSession", async () => {
        // Arrange
        const sessions = new DebuggerSessions();
        const handler = aHandler();
        const dispatcher = new CdpEventDispatcher(sessions).register(handler);
        const params = {
            requestId: "request-1",
        };

        // Act
        await dispatcher.dispatch(
            {
                tabId: 1,
                sessionId: "session-a",
            },
            "Network.loadingFinished",
            params
        );

        // Assert
        expect(sessions.sessionOf(1, "request-1")).toBe("session-a");
        expect(handler.handle).toHaveBeenCalledWith(
            1,
            params,
            "session-a"
        );
    });

    test("dispatch_WhenTheTopSessionReportsARequest_ShouldPassNoSession", async () => {
        // Arrange
        const sessions = new DebuggerSessions();
        const handler = aHandler();
        const dispatcher = new CdpEventDispatcher(sessions).register(handler);

        // Act
        await dispatcher.dispatch(
            {
                tabId: 1,
            },
            "Network.loadingFinished",
            {
                requestId: "request-1",
            }
        );

        // Assert
        expect(sessions.sessionOf(1, "request-1")).toBeUndefined();
        expect(handler.handle.mock.calls[0]?.[2]).toBeNull();
    });

    test("dispatch_WhenTheSourceHasNoTab_ShouldIgnoreTheEvent", async () => {
        // Arrange
        const handler = aHandler();
        const dispatcher = new CdpEventDispatcher(new DebuggerSessions()).register(handler);

        // Act
        await dispatcher.dispatch(
            {},
            "Network.loadingFinished",
            {}
        );

        // Assert
        expect(handler.handle).not.toHaveBeenCalled();
    });

    test("dispatch_WhenTwoHandlersShareAnEvent_ShouldRunBothInOrder", async () => {
        // Arrange
        const calls: string[] = [];
        const first = {
            event: "Network.loadingFinished" as const,
            handle: vi.fn(async () => {
                calls.push("first");
            }),
        };
        const second = {
            event: "Network.loadingFinished" as const,
            handle: vi.fn(async () => {
                calls.push("second");
            }),
        };
        const dispatcher = new CdpEventDispatcher(new DebuggerSessions())
            .register(first)
            .register(second);

        // Act
        await dispatcher.dispatch(
            {
                tabId: 1,
            },
            "Network.loadingFinished",
            {}
        );

        // Assert
        expect(calls).toEqual([
            "first",
            "second",
        ]);
    });
});
