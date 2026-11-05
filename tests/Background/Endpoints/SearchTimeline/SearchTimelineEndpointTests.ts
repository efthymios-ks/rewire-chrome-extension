import { describe, expect, test } from "vitest";
import { SearchTimelineEndpoint } from "../../../../src/Background/Endpoints/SearchTimeline/SearchTimelineEndpoint";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { SearchFields } from "../../../../src/Contracts/Search/SearchQuery";
import { aTimelineRecord } from "../../BackgroundTestData";

const TabId = 7;

describe("SearchTimelineEndpoint", () => {
    test("handle_WhenTheBodyMatches_ShouldReturnTheEntry", async () => {
        // Arrange
        const store = new TimelineStore();
        store.add(aTimelineRecord());
        const endpoint = new SearchTimelineEndpoint(store);

        // Act
        const result = await endpoint.handle({
            type: PanelCommandType.SearchTimeline,
            tabId: TabId,
            query: {
                text: "ada",
                isCaseSensitive: false,
                isRegex: false,
            },
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    entryId: "request-1",
                    fields: [SearchFields.ResponseBody],
                    count: 1,
                },
            ],
        });
    });
});
