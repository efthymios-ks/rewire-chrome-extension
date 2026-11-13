import { describe, expect, test } from "vitest";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { LiveChannelRemover } from "../../../../src/SidePanel/Features/Live/LiveChannelRemover";
import { aChannel } from "../../../TestData";
import { aPanelHarness, sentOf } from "../../PanelTestData";

function aHarness() {
    return aPanelHarness({
        inspectedTab: {
            tabId: 7,
            url: "https://app.example.com/",
            title: "App",
        },
        live: {
            channels: [
                aChannel(
                    "page-closed",
                    LiveChannelKind.WebSocket,
                    false
                ),
                aChannel(
                    "mine-closed",
                    LiveChannelKind.WebSocket,
                    false,
                    {
                        isMine: true,
                    }
                ),
                aChannel("page-open"),
            ],
            messages: [],
            postMessages: [],
        },
    });
}

describe("LiveChannelRemover", () => {
    test("remove_WhenClosedChannelsAreRemoved_ShouldDropThemAndTellTheWorkerAboutPageOnes", async () => {
        // Arrange
        const harness = aHarness();
        const remover = new LiveChannelRemover(harness.context);

        // Act
        await remover.remove([
            "page-closed",
            "mine-closed",
            "page-open",
        ]);

        // Assert
        expect(harness.store.getState().live.channels.map(channel => channel.id)).toEqual(["page-open"]);
        expect(sentOf(harness, PanelCommandType.RemoveLiveChannels)).toEqual([
            {
                type: PanelCommandType.RemoveLiveChannels,
                tabId: 7,
                channelIds: ["page-closed"],
            },
        ]);
    });

    test("remove_WhenOnlyMyChannelsGo_ShouldNotCallTheWorker", async () => {
        // Arrange
        const harness = aHarness();
        const remover = new LiveChannelRemover(harness.context);

        // Act
        await remover.remove(["mine-closed"]);

        // Assert
        expect(sentOf(harness, PanelCommandType.RemoveLiveChannels)).toEqual([]);
    });
});
