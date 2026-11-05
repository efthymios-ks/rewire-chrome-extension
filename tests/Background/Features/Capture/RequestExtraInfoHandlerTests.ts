import { describe, expect, test } from "vitest";
import { RequestExtraInfoHandler } from "../../../../src/Background/Features/Capture/RequestExtraInfoHandler";
import { TimelineRecordMapper } from "../../../../src/Background/Features/Capture/TimelineRecordMapper";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { aTimelineRecord } from "../../BackgroundTestData";

const TabId = 7;

describe("RequestExtraInfoHandler", () => {
    test("handle_WhenExtraInfoArrivesFirst_ShouldExposeTheRealHeadersInTheDetail", async () => {
        // Arrange
        const store = new TimelineStore();
        const handler = new RequestExtraInfoHandler(store);

        // Act
        await handler.handle(TabId, {
            requestId: "request-1",
            associatedCookies: [],
            headers: {
                Accept: "application/json",
                Cookie: "session=1",
            },
            connectTiming: {
                requestTime: 1,
            },
        });
        store.add(aTimelineRecord());

        // Assert
        expect(TimelineRecordMapper.toDetail(store.get(TabId, "request-1")!).requestHeaders).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "Cookie",
                value: "session=1",
            },
        ]);
    });
});
