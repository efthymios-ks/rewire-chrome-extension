import { describe, expect, test } from "vitest";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { ViewDefinitions } from "../../../../src/SidePanel/Features/Shell/ViewDefinitions";
import { aChannel, aPostMessage } from "../../../TestData";
import { aPanelHarness } from "../../PanelTestData";

describe("ViewDefinitions", () => {
    test("list_WhenRead_ShouldOfferEveryTabInOrder", () => {
        // Arrange
        const expected = [
            "Traffic",
            "Rules",
            "Cookie Jar",
            "JWT",
            "HTTP Client",
            "WS Client",
            "SSE Client",
            "postMessage",
            "HAR Inspector",
        ];

        // Act
        const labels = ViewDefinitions.map(definition => definition.label);

        // Assert
        expect(labels).toEqual(expected);
    });

    test.each([
        [
            ViewId.Client,
            "client-view",
        ],
        [
            ViewId.Jwt,
            "jwt-view",
        ],
        [
            ViewId.HarInspector,
            "har-view",
        ],
        [
            ViewId.WsClient,
            "ws-view",
        ],
        [
            ViewId.SseClient,
            "sse-view",
        ],
        [
            ViewId.PostMessage,
            "post-view",
        ],
    ])("create_WhenTheViewIs(%s)_ShouldBuildIt(%s)", (viewId, expected) => {
        // Arrange
        const definition = ViewDefinitions.find(candidate => candidate.id === viewId)!;

        // Act
        const root = definition.create(aPanelHarness().context);

        // Assert
        expect(root.classList.contains(expected)).toBe(true);
    });

    test("badgeOf_WhenLiveChannelsAreOpen_ShouldCountOpenSocketsStreamsAndMessages", () => {
        // Arrange
        const state = aPanelHarness({
            live: {
                channels: [
                    aChannel(
                        "ws-1",
                        LiveChannelKind.WebSocket,
                        true
                    ),
                    aChannel(
                        "ws-2",
                        LiveChannelKind.WebSocket,
                        false
                    ),
                    aChannel(
                        "sse-1",
                        LiveChannelKind.EventStream,
                        true
                    ),
                ],
                messages: [],
                postMessages: [
                    aPostMessage(),
                ],
            },
        }).store.getState();

        // Act
        const badges = [
            ViewId.WsClient,
            ViewId.SseClient,
            ViewId.PostMessage,
        ].map(viewId => ViewDefinitions.find(candidate => candidate.id === viewId)!.badgeOf(state));

        // Assert
        expect(badges).toEqual([
            "1",
            "1",
            "1",
        ]);
    });
});
