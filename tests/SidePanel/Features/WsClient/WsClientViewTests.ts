import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { LiveMessageDirection } from "../../../../src/Contracts/Live/LiveMessageDirection";
import { OwnSockets } from "../../../../src/SidePanel/Features/WsClient/OwnSockets";
import { WsClientView } from "../../../../src/SidePanel/Features/WsClient/WsClientView";
import { aChannel, aLiveMessage, aProfile, aSettings } from "../../../TestData";
import { aPanelHarness, buttonNamed, click } from "../../PanelTestData";
import { FakeSocket } from "./FakeSocket";

function aView(state: Parameters<typeof aPanelHarness>[0] = {}) {
    const harness = aPanelHarness(state);
    const socket = new FakeSocket();
    const createSocket = vi.fn(() => socket as unknown as WebSocket);
    const sockets = new OwnSockets({
        store: harness.store,
        headerRules: {
            add: vi.fn().mockResolvedValue(Result.ok(1)),
            remove: vi.fn().mockResolvedValue(undefined),
        },
        createSocket,
        now: () => new Date("2026-11-12T10:00:00.000Z"),
    });
    const view = new WsClientView(harness.context, sockets);

    return {
        harness,
        socket,
        createSocket,
        view,
    };
}

describe("WsClientView", () => {
    test("render_WhenThePageHasASocket_ShouldListItAndItsFramesWithoutASendBar", () => {
        // Arrange
        const state = {
            live: {
                channels: [aChannel("ws-1")],
                messages: [
                    aLiveMessage({
                        id: "frame-1",
                        direction: LiveMessageDirection.Sent,
                        data: "hello",
                    }),
                    aLiveMessage({
                        id: "frame-2",
                        data: "",
                        opcode: 9,
                    }),
                ],
                postMessages: [],
            },
        };

        // Act
        const { view } = aView(state);

        // Assert
        expect(view.root.querySelector(".live-channel .tag")?.textContent).toBe("Page");
        const rows = [...view.root.querySelectorAll(".live-list .live-item")];
        expect(rows.map(row => row.querySelector(".live-item-title")?.textContent)).toEqual([
            "↓ping",
            "↑hello",
        ]);
        expect(rows[0]?.classList.contains("muted-item")).toBe(true);
        expect(view.root.querySelector<HTMLElement>(".ws-send")?.hidden).toBe(true);
    });

    test("connect_WhenAUrlWithAVariableIsGiven_ShouldOpenMySocketAndOfferTheSendBar", async () => {
        // Arrange
        const { createSocket, socket, view } = aView({
            settings: aSettings({
                profiles: [
                    aProfile({
                        variables: [
                            {
                                name: "host",
                                value: "live.example.com",
                            },
                        ],
                    }),
                ],
            }),
        });
        view.root.querySelector<HTMLInputElement>(".live-url")!.value = "wss://{{host}}/socket";

        // Act
        click(buttonNamed(view.root, "Connect"));
        await new Promise(resolve => setTimeout(resolve, 0));
        const input = view.root.querySelector<HTMLInputElement>(".ws-send input")!;
        input.value = "ping";
        click(buttonNamed(view.root.querySelector(".ws-send")!, "Send"));

        // Assert
        expect(createSocket).toHaveBeenCalledWith("wss://live.example.com/socket");
        expect(view.root.querySelector<HTMLElement>(".ws-send")?.hidden).toBe(false);
        expect(socket.sent).toEqual(["ping"]);
    });

    test("filter_WhenTextIsTyped_ShouldKeepOnlyMatchingFrames", () => {
        // Arrange
        const { view } = aView({
            live: {
                channels: [aChannel("ws-1", LiveChannelKind.WebSocket)],
                messages: [
                    aLiveMessage({
                        id: "frame-1",
                        data: "{\"type\":\"price\"}",
                    }),
                    aLiveMessage({
                        id: "frame-2",
                        data: "{\"type\":\"chat\"}",
                    }),
                ],
                postMessages: [],
            },
        });
        const filter = view.root.querySelector<HTMLInputElement>(".live-filter")!;

        // Act
        filter.value = "CHAT";
        filter.dispatchEvent(new Event("input"));

        // Assert
        expect(view.root.querySelectorAll(".live-list .live-item")).toHaveLength(1);
    });

    test("clearClosed_WhenClicked_ShouldRemoveClosedSocketsAndKeepOpenOnes", async () => {
        // Arrange
        const { harness, view } = aView({
            live: {
                channels: [
                    aChannel(
                        "ws-closed",
                        LiveChannelKind.WebSocket,
                        false,
                        {
                            isMine: true,
                        }
                    ),
                    aChannel("ws-open"),
                ],
                messages: [],
                postMessages: [],
            },
        });

        // Act
        click(buttonNamed(view.root, "Clear closed"));
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assert
        expect(harness.store.getState().live.channels.map(channel => channel.id)).toEqual(["ws-open"]);
        expect(buttonNamed(view.root, "Clear closed").hidden).toBe(true);
    });

    test("constructor_WhenBuilt_ShouldOfferThePageSocketsSwitchOff", () => {
        // Arrange
        const state = {};

        // Act
        const { view } = aView(state);

        // Assert
        const toggle = view.root.querySelector(".listening-toggle");
        expect(toggle?.textContent).toBe("Listen to page sockets");
        expect(toggle?.querySelector<HTMLInputElement>("input")?.checked).toBe(false);
    });
});
