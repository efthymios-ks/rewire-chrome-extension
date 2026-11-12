import { describe, expect, test } from "vitest";
import { GetTimelineDetailsEndpoint } from "../../../../src/Background/Endpoints/GetTimelineDetails/GetTimelineDetailsEndpoint";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { aSummary } from "../../../TestData";
import { aTimelineRecord } from "../../BackgroundTestData";

const TabId = 7;

describe("GetTimelineDetailsEndpoint", () => {
    test("handle_WhenTheTabHasCalls_ShouldReturnEveryDetail", async () => {
        // Arrange
        const store = new TimelineStore();
        store.add(aTimelineRecord());
        store.add(aTimelineRecord({
            summary: aSummary({
                id: "request-2",
            }),
        }));
        const endpoint = new GetTimelineDetailsEndpoint(store);

        // Act
        const result = await endpoint.handle({
            type: PanelCommandType.GetTimelineDetails,
            tabId: TabId,
        });

        // Assert
        expect(result.hasErrors ? [] : result.value.map(detail => `${detail.summary.id}:${detail.responseBody}`)).toEqual([
            "request-1:{\"name\":\"Ada\"}",
            "request-2:{\"name\":\"Ada\"}",
        ]);
    });

    test("handle_WhenTheTabHasNoCalls_ShouldReturnAnEmptyList", async () => {
        // Arrange
        const endpoint = new GetTimelineDetailsEndpoint(new TimelineStore());

        // Act
        const result = await endpoint.handle({
            type: PanelCommandType.GetTimelineDetails,
            tabId: TabId,
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });
});
