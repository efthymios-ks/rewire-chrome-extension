import { describe, expect, test, vi } from "vitest";
import { LiveLimits, LiveStore } from "../../../../src/Background/Features/Live/LiveStore";
import { WorkerEventType } from "../../../../src/Contracts/Messaging/WorkerEventType";
import { aChannel, aLiveMessage, aPostMessage } from "../../../TestData";

function draftOf(index: number) {
    const { id: _id, ...draft } = aLiveMessage({
        data: `frame ${index}`,
    });

    return draft;
}

describe("LiveStore", () => {
    test("upsertChannel_WhenAChannelOpens_ShouldStoreItAndTellListeners", () => {
        // Arrange
        const store = new LiveStore();
        const listener = vi.fn();
        store.subscribe(listener);

        // Act
        store.upsertChannel(aChannel("ws-1"));

        // Assert
        expect(store.channelOf(7, "ws-1")?.url).toBe("wss://live.example.com/socket");
        expect(listener).toHaveBeenCalledWith(
            7,
            {
                type: WorkerEventType.ChannelUpserted,
                channel: aChannel("ws-1"),
            }
        );
    });

    test("addMessage_WhenTheLimitIsPassed_ShouldDropTheOldestAndNumberEachMessage", () => {
        // Arrange
        const store = new LiveStore();
        for (let index = 0; index < LiveLimits.MaxMessagesPerTab; index++) {
            store.addMessage(7, draftOf(index));
        }

        // Act
        store.addMessage(7, draftOf(LiveLimits.MaxMessagesPerTab));

        // Assert
        const { messages } = store.snapshot(7);
        expect(messages).toHaveLength(LiveLimits.MaxMessagesPerTab);
        expect(messages[0]?.data).toBe("frame 1");
        expect(new Set(messages.map(message => message.id)).size).toBe(LiveLimits.MaxMessagesPerTab);
    });

    test("snapshot_WhenTheTabIsCleared_ShouldBeEmpty", () => {
        // Arrange
        const store = new LiveStore();
        const { id: _id, ...record } = aPostMessage();
        store.upsertChannel(aChannel("ws-1"));
        store.addPostMessage(record);

        // Act
        store.clear(7);

        // Assert
        expect(store.snapshot(7)).toEqual({
            channels: [],
            messages: [],
            postMessages: [],
        });
    });
});
