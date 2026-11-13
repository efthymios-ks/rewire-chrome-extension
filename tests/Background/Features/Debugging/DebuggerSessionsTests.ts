import { describe, expect, test } from "vitest";
import { DebuggerSessions, MaxRoutesPerTab } from "../../../../src/Background/Features/Debugging/DebuggerSessions";

describe("DebuggerSessions", () => {
    test("childrenOf_WhenChildrenAreAddedAndRemoved_ShouldListTheOnesLeft", () => {
        // Arrange
        const sessions = new DebuggerSessions();
        sessions.addChild(1, "session-a");
        sessions.addChild(1, "session-b");

        // Act
        sessions.removeChild(1, "session-a");

        // Assert
        expect(sessions.childrenOf(1)).toEqual(["session-b"]);
        expect(sessions.childrenOf(2)).toEqual([]);
    });

    test("sessionOf_WhenARequestWasSeenInAChild_ShouldReturnThatChild", () => {
        // Arrange
        const sessions = new DebuggerSessions();

        // Act
        sessions.remember(
            1,
            "request-1",
            "session-a"
        );

        // Assert
        expect(sessions.sessionOf(1, "request-1")).toBe("session-a");
        expect(sessions.sessionOf(2, "request-1")).toBeUndefined();
    });

    test("removeChild_WhenTheChildGoes_ShouldDropItsRequests", () => {
        // Arrange
        const sessions = new DebuggerSessions();
        sessions.addChild(1, "session-a");
        sessions.remember(
            1,
            "request-1",
            "session-a"
        );
        sessions.remember(
            1,
            "request-2",
            "session-b"
        );

        // Act
        sessions.removeChild(1, "session-a");

        // Assert
        expect(sessions.sessionOf(1, "request-1")).toBeUndefined();
        expect(sessions.sessionOf(1, "request-2")).toBe("session-b");
    });

    test("remember_WhenTheLimitIsPassed_ShouldDropTheOldestRequest", () => {
        // Arrange
        const sessions = new DebuggerSessions();
        for (let index = 0; index < MaxRoutesPerTab; index++) {
            sessions.remember(
                1,
                `request-${index}`,
                "session-a"
            );
        }

        // Act
        sessions.remember(
            1,
            "request-last",
            "session-a"
        );

        // Assert
        expect(sessions.sessionOf(1, "request-0")).toBeUndefined();
        expect(sessions.sessionOf(1, "request-last")).toBe("session-a");
    });

    test("forget_WhenTheTabGoes_ShouldDropItsChildrenAndRequests", () => {
        // Arrange
        const sessions = new DebuggerSessions();
        sessions.addChild(1, "session-a");
        sessions.remember(
            1,
            "request-1",
            "session-a"
        );

        // Act
        sessions.forget(1);

        // Assert
        expect(sessions.childrenOf(1)).toEqual([]);
        expect(sessions.sessionOf(1, "request-1")).toBeUndefined();
    });
});
