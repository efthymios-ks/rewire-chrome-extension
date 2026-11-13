import { describe, expect, test } from "vitest";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { SearchFields } from "../../../../src/Contracts/Search/SearchQuery";
import { HarConnection } from "../../../../src/SidePanel/Features/HarInspector/HarConnection";
import { aDetail, aSummary } from "../../../TestData";

const Details = [
    aDetail({
        summary: aSummary({
            id: "har-1",
        }),
        responseBody: "{\"name\":\"Ada\"}",
    }),
    aDetail({
        summary: aSummary({
            id: "har-2",
        }),
        responseBody: "{\"name\":\"Grace\"}",
    }),
];

describe("HarConnection", () => {
    test("send_WhenADetailIsAskedFor_ShouldReturnItFromTheFile", async () => {
        // Arrange
        const connection = new HarConnection(Details);

        // Act
        const result = await connection.send({
            type: PanelCommandType.GetEntryDetail,
            tabId: -1,
            entryId: "har-2",
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: Details[1],
        });
    });

    test("send_WhenTheCallIsNotInTheFile_ShouldSaySo", async () => {
        // Arrange
        const connection = new HarConnection(Details);

        // Act
        const result = await connection.send({
            type: PanelCommandType.GetEntryDetail,
            tabId: -1,
            entryId: "har-9",
        });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "This call isn't in the file.",
        });
    });

    test("send_WhenSearching_ShouldSearchTheFileBodies", async () => {
        // Arrange
        const connection = new HarConnection(Details);

        // Act
        const result = await connection.send({
            type: PanelCommandType.SearchTimeline,
            tabId: -1,
            query: {
                text: "grace",
                isRegex: false,
            },
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    entryId: "har-2",
                    fields: [SearchFields.ResponseBody],
                    count: 1,
                },
            ],
        });
    });

    test("send_WhenEveryDetailIsAskedFor_ShouldReturnThemAllAndIgnoreOtherCommands", async () => {
        // Arrange
        const connection = new HarConnection(Details);

        // Act
        const details = await connection.send({
            type: PanelCommandType.GetTimelineDetails,
            tabId: -1,
        });
        const cleared = await connection.send({
            type: PanelCommandType.ClearTimeline,
            tabId: -1,
        });

        // Assert
        expect(details).toEqual({
            hasErrors: false,
            value: Details,
        });
        expect(cleared.hasErrors).toBe(false);
    });
});
