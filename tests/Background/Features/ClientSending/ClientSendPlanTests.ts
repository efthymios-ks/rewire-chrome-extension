import { describe, expect, test } from "vitest";
import { ClientSendPlan } from "../../../../src/Background/Features/ClientSending/ClientSendPlan";

describe("ClientSendPlan", () => {
    test("scriptOf_WhenTheRequestHasABody_ShouldFetchAPlaceholderPostWithTheMarker", () => {
        // Arrange
        const url = "https://login.example.com/token?a=\"b\"";

        // Act
        const script = ClientSendPlan.scriptOf(
            url,
            "send-1",
            true
        );

        // Assert
        expect(script).toContain(`fetch(${JSON.stringify(url)}, {"method":"POST","headers":{"x-rewire-send":"send-1"},"credentials":"omit","cache":"no-store","body":"-"})`);
        expect(script).toContain("durationInMilliseconds");
    });

    test("scriptOf_WhenTheRequestHasNoBody_ShouldFetchWithGetAndNoBody", () => {
        // Arrange
        const url = "https://api.example.com/users";

        // Act
        const script = ClientSendPlan.scriptOf(
            url,
            "send-2",
            false
        );

        // Assert
        expect(script).toContain("{\"method\":\"GET\",\"headers\":{\"x-rewire-send\":\"send-2\"},\"credentials\":\"omit\",\"cache\":\"no-store\"}");
    });

    test("markerOf_WhenTheHeaderIsPresentInAnyCase_ShouldReturnItsValue", () => {
        // Arrange
        const headers = {
            "Accept": "*/*",
            "X-Rewire-Send": "send-3",
        };

        // Act
        const marker = ClientSendPlan.markerOf(headers);

        // Assert
        expect(marker).toBe("send-3");
        expect(ClientSendPlan.markerOf({})).toBeNull();
    });

    test("withoutMarker_WhenCalled_ShouldKeepEveryOtherHeader", () => {
        // Arrange
        const headers = {
            "Accept": "*/*",
            "x-rewire-send": "send-4",
        };

        // Act
        const kept = ClientSendPlan.withoutMarker(headers);

        // Assert
        expect(kept).toEqual([
            {
                name: "Accept",
                value: "*/*",
            },
        ]);
    });

    test("mergedHeaders_WhenTheUserSetsHeaders_ShouldReplaceTheBrowserOnesAndDropThePlaceholderParts", () => {
        // Arrange
        const browserHeaders = {
            "Accept": "*/*",
            "User-Agent": "Chrome",
            "Content-Type": "text/plain;charset=UTF-8",
            "Content-Length": "1",
            "Origin": "chrome-extension://abc",
            "x-rewire-send": "send-5",
        };
        const requested = [
            {
                name: "user-agent",
                value: "Rewire",
            },
            {
                name: "Cookie",
                value: "session=abc",
            },
            {
                name: "Content-Type",
                value: "application/x-www-form-urlencoded",
            },
            {
                name: " ",
                value: "ignored",
            },
        ];

        // Act
        const merged = ClientSendPlan.mergedHeaders(browserHeaders, requested);

        // Assert
        expect(merged).toEqual([
            {
                name: "Accept",
                value: "*/*",
            },
            {
                name: "user-agent",
                value: "Rewire",
            },
            {
                name: "Cookie",
                value: "session=abc",
            },
            {
                name: "Content-Type",
                value: "application/x-www-form-urlencoded",
            },
        ]);
    });
});
