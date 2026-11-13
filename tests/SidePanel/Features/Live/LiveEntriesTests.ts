import { describe, expect, test } from "vitest";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { LiveEntries, LiveLimits } from "../../../../src/SidePanel/Features/Live/LiveEntries";
import { aChannel, aLiveMessage, aPostMessage } from "../../../TestData";

const Mine = aChannel(
    "mine-ws-1",
    LiveChannelKind.WebSocket,
    true,
    {
        isMine: true,
    }
);

describe("LiveEntries", () => {
    test("withPage_WhenASnapshotArrives_ShouldKeepMyChannelsAndAddThePageOnes", () => {
        // Arrange
        const live = {
            channels: [
                Mine,
                aChannel("old-page-ws"),
            ],
            messages: [
                aLiveMessage({
                    id: "mine-frame",
                    channelId: "mine-ws-1",
                }),
            ],
            postMessages: [],
        };

        // Act
        const merged = LiveEntries.withPage(
            live,
            {
                channels: [aChannel("page-ws")],
                messages: [
                    aLiveMessage({
                        id: "page-frame",
                        channelId: "page-ws",
                    }),
                ],
                postMessages: [aPostMessage()],
            }
        );

        // Assert
        expect(merged.channels.map(channel => channel.id)).toEqual([
            "mine-ws-1",
            "page-ws",
        ]);
        expect(merged.messages.map(message => message.id)).toEqual([
            "mine-frame",
            "page-frame",
        ]);
        expect(merged.postMessages).toHaveLength(1);
    });

    test("upsertChannel_WhenTheChannelExists_ShouldReplaceItInPlace", () => {
        // Arrange
        const live = {
            ...LiveEntries.empty(),
            channels: [
                aChannel("ws-1"),
                aChannel("ws-2"),
            ],
        };

        // Act
        const updated = LiveEntries.upsertChannel(live, aChannel(
            "ws-1",
            LiveChannelKind.WebSocket,
            false
        ));

        // Assert
        expect(updated.channels.map(channel => `${channel.id}:${channel.isOpen}`)).toEqual([
            "ws-1:false",
            "ws-2:true",
        ]);
    });

    test("addMessage_WhenTheLimitIsPassed_ShouldDropTheOldest", () => {
        // Arrange
        const live = {
            ...LiveEntries.empty(),
            messages: Array.from({
                length: LiveLimits.MaxMessages,
            }, (_, index) => aLiveMessage({
                id: `frame-${index}`,
            })),
        };

        // Act
        const updated = LiveEntries.addMessage(live, aLiveMessage({
            id: "newest",
        }));

        // Assert
        expect(updated.messages).toHaveLength(LiveLimits.MaxMessages);
        expect(updated.messages[0]?.id).toBe("frame-1");
        expect(updated.messages.at(-1)?.id).toBe("newest");
    });

    test("withoutChannels_WhenChannelsAreRemoved_ShouldDropThemAndTheirMessages", () => {
        // Arrange
        const live = {
            ...LiveEntries.empty(),
            channels: [
                aChannel("ws-1"),
                aChannel("ws-2"),
            ],
            messages: [
                aLiveMessage({
                    id: "frame-1",
                    channelId: "ws-1",
                }),
                aLiveMessage({
                    id: "frame-2",
                    channelId: "ws-2",
                }),
            ],
        };

        // Act
        const updated = LiveEntries.withoutChannels(live, ["ws-1"]);

        // Assert
        expect(updated.channels.map(channel => channel.id)).toEqual(["ws-2"]);
        expect(updated.messages.map(message => message.id)).toEqual(["frame-2"]);
    });
});
