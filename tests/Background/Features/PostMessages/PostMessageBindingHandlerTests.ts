import { describe, expect, test, vi } from "vitest";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { PostMessageBindingHandler } from "../../../../src/Background/Features/PostMessages/PostMessageBindingHandler";
import { PostMessageBindingName, type PostMessageReport } from "../../../../src/Background/Features/PostMessages/PostMessageProbe";

function aReport(overrides: Partial<PostMessageReport> = {}): PostMessageReport {
    return {
        origin: "https://pay.example.com",
        href: "https://app.example.com/checkout",
        isTop: true,
        isFromTop: false,
        isFromSelf: false,
        data: "{\"status\":\"paid\"}",
        ...overrides,
    };
}

function setUp(isMine: boolean) {
    const store = new LiveStore();
    const sender = {
        send: vi.fn(),
        claim: vi.fn().mockReturnValue(isMine),
    };
    const handler = new PostMessageBindingHandler(
        store,
        sender,
        () => new Date("2026-11-12T10:00:00.000Z")
    );

    return {
        store,
        sender,
        handler,
    };
}

describe("PostMessageBindingHandler", () => {
    test("handle_WhenAnIframeMessagesTheTopFrame_ShouldRecordFromAndTo", async () => {
        // Arrange
        const { store, handler } = setUp(false);

        // Act
        await handler.handle(7, {
            name: PostMessageBindingName,
            payload: JSON.stringify(aReport()),
            executionContextId: 1,
        });

        // Assert
        expect(store.snapshot(7).postMessages[0]).toMatchObject({
            from: "pay.example.com",
            to: "top",
            origin: "https://pay.example.com",
            data: "{\"status\":\"paid\"}",
            size: 17,
            isMine: false,
        });
    });

    test("handle_WhenTheTopFrameMessagesAnIframe_ShouldMarkTheSenderAsTop", async () => {
        // Arrange
        const { store, sender, handler } = setUp(true);

        // Act
        await handler.handle(7, {
            name: PostMessageBindingName,
            payload: JSON.stringify(aReport({
                href: "https://pay.example.com/frame",
                isTop: false,
                isFromTop: true,
                origin: "https://app.example.com",
            })),
            executionContextId: 1,
        });

        // Assert
        expect(store.snapshot(7).postMessages[0]).toMatchObject({
            from: "top",
            to: "pay.example.com",
            isMine: true,
        });
        expect(sender.claim).toHaveBeenCalledWith(
            7,
            "pay.example.com",
            "{\"status\":\"paid\"}"
        );
    });

    test("handle_WhenAnotherBindingIsCalled_ShouldIgnoreIt", async () => {
        // Arrange
        const { store, handler } = setUp(false);

        // Act
        await handler.handle(7, {
            name: "somethingElse",
            payload: JSON.stringify(aReport()),
            executionContextId: 1,
        });

        // Assert
        expect(store.snapshot(7).postMessages).toEqual([]);
    });
});
