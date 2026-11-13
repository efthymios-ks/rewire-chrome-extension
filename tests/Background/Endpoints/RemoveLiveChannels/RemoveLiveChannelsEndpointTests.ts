import { describe, expect, test } from "vitest";
import { RemoveLiveChannelsEndpoint } from "../../../../src/Background/Endpoints/RemoveLiveChannels/RemoveLiveChannelsEndpoint";
import { LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { aChannel, aLiveMessage } from "../../../TestData";

describe("RemoveLiveChannelsEndpoint", () => {
    test("handle_WhenClosedSocketsAreRemoved_ShouldDropThemAndTheirFrames", async () => {
        // Arrange
        const store = new LiveStore();
        store.upsertChannel(aChannel("ws-1"));
        store.upsertChannel(aChannel("ws-2"));
        const { id: _first, ...firstFrame } = aLiveMessage({
            channelId: "ws-1",
        });
        const { id: _second, ...secondFrame } = aLiveMessage({
            channelId: "ws-2",
        });
        store.addMessage(7, firstFrame);
        store.addMessage(7, secondFrame);
        const endpoint = new RemoveLiveChannelsEndpoint(store);

        // Act
        const result = await endpoint.handle({
            type: PanelCommandType.RemoveLiveChannels,
            tabId: 7,
            channelIds: ["ws-1"],
        });

        // Assert
        expect(result.hasErrors).toBe(false);
        const snapshot = store.snapshot(7);
        expect(snapshot.channels.map(channel => channel.id)).toEqual(["ws-2"]);
        expect(snapshot.messages.map(message => message.channelId)).toEqual(["ws-2"]);
    });
});
