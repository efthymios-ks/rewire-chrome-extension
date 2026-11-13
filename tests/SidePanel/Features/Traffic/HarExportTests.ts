import { describe, expect, test, vi } from "vitest";
import type { HarDocument } from "../../../../src/Common/Har/HarDocument";
import { Result } from "../../../../src/Common/Results/Result";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import type { TimelineEntryDetail } from "../../../../src/Contracts/Timeline/TimelineEntryDetail";
import type { IFileClient } from "../../../../src/SidePanel/Core/FileClient";
import { HarExport } from "../../../../src/SidePanel/Features/Traffic/HarExport";
import { aDetail } from "../../../TestData";
import { aPanelHarness } from "../../PanelTestData";

const Now = new Date("2026-11-12T10:30:45.123Z");

function setUp(details: TimelineEntryDetail[] = [aDetail()], hasTab: boolean = true) {
    const harness = aPanelHarness({
        inspectedTab: hasTab
            ? {
                tabId: 7,
                url: "https://api.example.com:8443/users",
                title: "Users",
            }
            : null,
    });
    vi.mocked(harness.context.connection.send).mockResolvedValue(Result.ok(details));
    const fileClient: IFileClient = {
        download: vi.fn(),
        pickText: vi.fn(),
        pickNamedText: vi.fn(),
    };
    const harExport = new HarExport({
        context: harness.context,
        fileClient,
        versionOf: () => "0.0.1",
        now: () => Now,
    });

    return {
        harness,
        fileClient,
        harExport,
    };
}

describe("HarExport", () => {
    test("download_WhenTheTabHasCalls_ShouldSaveAHarFileNamedAfterTheHost", async () => {
        // Arrange
        const { harness, fileClient, harExport } = setUp();

        // Act
        await harExport.download(false);

        // Assert
        expect(vi.mocked(harness.context.connection.send).mock.calls.map(call => call[0])).toEqual([
            {
                type: PanelCommandType.GetTimelineDetails,
                tabId: 7,
            },
        ]);
        const [text, fileName, mimeType] = vi.mocked(fileClient.download).mock.calls[0]!;
        expect(fileName).toBe("api.example.com-8443-2026-11-12T10-30-45.har");
        expect(mimeType).toBe("application/json");
        const har = JSON.parse(text) as HarDocument;
        expect(har.log.creator.version).toBe("0.0.1");
        expect(har.log.entries).toHaveLength(1);
    });

    test("copy_WhenSecretsAreIncluded_ShouldCopyTheFullHar", async () => {
        // Arrange
        const { harness, harExport } = setUp([
            aDetail({
                requestHeaders: [
                    {
                        name: "Authorization",
                        value: "Bearer secret",
                    },
                ],
            }),
        ]);

        // Act
        await harExport.copy(true);

        // Assert
        const har = JSON.parse(harness.copied[0]!) as HarDocument;
        expect(har.log.entries[0]?.request.headers).toEqual([
            {
                name: "Authorization",
                value: "Bearer secret",
            },
        ]);
        expect(harness.noticeText()).toBe("HAR copied.");
    });

    test("copy_WhenTheTimelineIsEmpty_ShouldSaySoAndCopyNothing", async () => {
        // Arrange
        const { harness, harExport } = setUp([]);

        // Act
        await harExport.copy(false);

        // Assert
        expect(harness.copied).toEqual([]);
        expect(harness.noticeText()).toBe("The timeline is empty.");
    });

    test("download_WhenNoTabIsInspected_ShouldSaySo", async () => {
        // Arrange
        const { harness, fileClient, harExport } = setUp([], false);

        // Act
        await harExport.download(false);

        // Assert
        expect(fileClient.download).not.toHaveBeenCalled();
        expect(harness.context.connection.send).not.toHaveBeenCalled();
        expect(harness.noticeText()).toBe("No tab is inspected.");
    });
});
