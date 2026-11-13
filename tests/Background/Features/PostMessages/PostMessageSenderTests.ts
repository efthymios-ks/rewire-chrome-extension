import { describe, expect, test, vi } from "vitest";
import { PostMessageSender } from "../../../../src/Background/Features/PostMessages/PostMessageSender";
import { Result } from "../../../../src/Common/Results/Result";
import { createDebuggerClientMock } from "../../BackgroundTestData";

function setUp(found: boolean) {
    const debuggerMock = createDebuggerClientMock();
    const sendToSession = vi.mocked(debuggerMock.client.sendToSession);
    sendToSession.mockResolvedValue(Result.ok({
        result: {
            type: "boolean",
            value: found,
        },
    }));
    let now = 1000;
    const sender = new PostMessageSender(debuggerMock.client, () => now);

    return {
        sendToSession,
        sender,
        advance: (milliseconds: number) => {
            now += milliseconds;
        },
    };
}

describe("PostMessageSender", () => {
    test("send_WhenTheTargetIsAnIframe_ShouldPostFromTheTopFrameAsAnObject", async () => {
        // Arrange
        const { sendToSession, sender } = setUp(true);

        // Act
        const result = await sender.send(
            7,
            "pay.example.com",
            "{ \"type\": \"ping\" }"
        );

        // Assert
        expect(result.hasErrors).toBe(false);
        const [call] = sendToSession.mock.calls;
        expect(call?.slice(0, 3)).toEqual([
            7,
            null,
            "Runtime.evaluate",
        ]);
        const expression = (call?.[3] as { expression: string }).expression;
        expect(expression).toContain("\"pay.example.com\"");
        expect(expression).toContain("postMessage({\"type\":\"ping\"}, \"*\")");
    });

    test("send_WhenNoIframeMatches_ShouldSaySo", async () => {
        // Arrange
        const { sender } = setUp(false);

        // Act
        const result = await sender.send(
            7,
            "pay.example.com",
            "hello"
        );

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "No iframe from pay.example.com on the page.",
        });
    });

    test("claim_WhenTheSentMessageArrives_ShouldClaimItOnce", async () => {
        // Arrange
        const { sender } = setUp(true);
        await sender.send(
            7,
            "top",
            "hello"
        );

        // Act
        const first = sender.claim(
            7,
            "top",
            "hello"
        );
        const second = sender.claim(
            7,
            "top",
            "hello"
        );

        // Assert
        expect(first).toBe(true);
        expect(second).toBe(false);
    });

    test("claim_WhenTheMessageArrivesTooLate_ShouldNotClaimIt", async () => {
        // Arrange
        const { sender, advance } = setUp(true);
        await sender.send(
            7,
            "top",
            "hello"
        );
        advance(5000);

        // Act
        const claimed = sender.claim(
            7,
            "top",
            "hello"
        );

        // Assert
        expect(claimed).toBe(false);
    });
});
