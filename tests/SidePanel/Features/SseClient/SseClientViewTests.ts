import { describe, expect, test, vi } from "vitest";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { OwnStreams } from "../../../../src/SidePanel/Features/SseClient/OwnStreams";
import { SseClientView } from "../../../../src/SidePanel/Features/SseClient/SseClientView";
import { aChannel, aLiveMessage } from "../../../TestData";
import { aPanelHarness, buttonNamed, click } from "../../PanelTestData";

const StreamState = {
    live: {
        channels: [aChannel("sse-1", LiveChannelKind.EventStream)],
        messages: [
            aLiveMessage({
                id: "event-1",
                channelId: "sse-1",
                eventName: "price",
                eventId: "7",
                data: "{\"sku\":\"CAP\"}",
                opcode: null,
            }),
            aLiveMessage({
                id: "event-2",
                channelId: "sse-1",
                data: null,
                opcode: null,
            }),
        ],
        postMessages: [],
    },
};

describe("SseClientView", () => {
    test("render_WhenThePageHasAStream_ShouldShowEventsWithAndWithoutData", () => {
        // Arrange
        const harness = aPanelHarness(StreamState);

        // Act
        const view = new SseClientView(harness.context);

        // Assert
        const rows = [...view.root.querySelectorAll(".live-list .live-item")];
        expect(rows.map(row => row.querySelector(".live-item-title")?.textContent)).toEqual([
            "message",
            "price",
        ]);
        expect(rows[0]?.classList.contains("muted-item")).toBe(true);
        expect(rows[1]?.querySelector(".live-item-preview")?.textContent).toBe("{\"sku\":\"CAP\"}");
        expect(view.root.querySelector(".live-send")).toBeNull();
    });

    test("click_WhenAnEventIsOpened_ShouldShowItsFacts", () => {
        // Arrange
        const view = new SseClientView(aPanelHarness(StreamState).context);

        // Act
        click(view.root.querySelectorAll(".live-list .live-item-head")[1]);

        // Assert
        expect(view.root.querySelector(".live-facts")?.textContent).toBe("event price · id 7 · retry none · 16 B · 10:00:01.250");
    });

    test("subscribe_WhenAUrlIsGiven_ShouldStartMyStream", () => {
        // Arrange
        const harness = aPanelHarness();
        const streams = new OwnStreams({
            store: harness.store,
            fetch: vi.fn(() => new Promise<Response>(() => undefined)),
            onError: vi.fn(),
            now: () => new Date("2026-11-12T10:00:00.000Z"),
        });
        const view = new SseClientView(harness.context, streams);
        view.root.querySelector<HTMLInputElement>(".live-url")!.value = "https://api.example.com/events";

        // Act
        click(buttonNamed(view.root, "Subscribe"));

        // Assert
        expect(view.root.querySelector(".live-channel .tag")?.textContent).toBe("Mine");
        expect(view.root.querySelector("[title='Stop this stream']")).not.toBeNull();
    });
});
