import { describe, expect, test } from "vitest";
import { ResponseExtraInfoHandler } from "../../../../src/Background/Features/Capture/ResponseExtraInfoHandler";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { aTimelineRecord } from "../../BackgroundTestData";

const TabId = 7;

describe("ResponseExtraInfoHandler", () => {
    test("handle_WhenSeveralCookiesAreSet_ShouldSplitThem", async () => {
        // Arrange
        const store = new TimelineStore();
        store.add(aTimelineRecord());
        const handler = new ResponseExtraInfoHandler(store);

        // Act
        await handler.handle(TabId, {
            requestId: "request-1",
            blockedCookies: [],
            headers: {
                "set-cookie": "a=1\nb=2",
            },
            resourceIPAddressSpace: "Public",
            statusCode: 200,
        });

        // Assert
        expect(store.get(TabId, "request-1")?.rawResponseHeaders).toEqual([
            {
                name: "set-cookie",
                value: "a=1",
            },
            {
                name: "set-cookie",
                value: "b=2",
            },
        ]);
    });
});
