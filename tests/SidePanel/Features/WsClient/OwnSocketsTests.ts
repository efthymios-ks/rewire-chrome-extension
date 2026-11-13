import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import { LiveMessageDirection } from "../../../../src/Contracts/Live/LiveMessageDirection";
import type { PanelState } from "../../../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { Store } from "../../../../src/SidePanel/Core/Store";
import { OwnSockets } from "../../../../src/SidePanel/Features/WsClient/OwnSockets";
import { FakeSocket } from "./FakeSocket";

function setUp() {
    const store = new Store<PanelState>(PanelStateFactory.initial());
    const socket = new FakeSocket();
    const headerRules = {
        add: vi.fn().mockResolvedValue(Result.ok(1_000_000)),
        remove: vi.fn().mockResolvedValue(undefined),
    };
    const sockets = new OwnSockets({
        store,
        headerRules,
        createSocket: () => socket as unknown as WebSocket,
        now: () => new Date("2026-11-12T10:00:00.000Z"),
    });

    return {
        store,
        socket,
        headerRules,
        sockets,
    };
}

describe("OwnSockets", () => {
    test("connect_WhenHeadersAreGiven_ShouldSetThemForTheHandshakeAndAddMySocket", async () => {
        // Arrange
        const { store, headerRules, sockets } = setUp();
        const headers = [
            {
                name: "Authorization",
                value: "Bearer abc",
            },
        ];

        // Act
        const connected = await sockets.connect("wss://live.example.com/socket", headers);

        // Assert
        expect(connected).toEqual({
            hasErrors: false,
            value: "mine-ws-1",
        });
        expect(headerRules.add).toHaveBeenCalledWith("wss://live.example.com/socket", headers);
        expect(store.getState().live.channels[0]).toMatchObject({
            id: "mine-ws-1",
            isMine: true,
            isOpen: true,
        });
    });

    test("send_WhenMySocketIsOpen_ShouldSendAndRecordBothDirections", async () => {
        // Arrange
        const { store, socket, sockets } = setUp();
        await sockets.connect("wss://live.example.com/socket", []);

        // Act
        const sent = sockets.send("mine-ws-1", "ping");
        socket.receive("pong");
        socket.receive(new Uint8Array([
            0,
            1,
            2,
        ]).buffer);

        // Assert
        expect(sent.hasErrors).toBe(false);
        expect(socket.sent).toEqual(["ping"]);
        expect(store.getState().live.messages.map(message => [
            message.direction,
            message.data,
            message.opcode,
        ])).toEqual([
            [
                LiveMessageDirection.Sent,
                "ping",
                1,
            ],
            [
                LiveMessageDirection.Received,
                "pong",
                1,
            ],
            [
                LiveMessageDirection.Received,
                "AAEC",
                2,
            ],
        ]);
    });

    test("close_WhenMySocketCloses_ShouldMarkItClosedAndDropTheHeaderRule", async () => {
        // Arrange
        const { store, headerRules, sockets } = setUp();
        await sockets.connect(
            "wss://live.example.com/socket",
            [
                {
                    name: "X-Trace",
                    value: "1",
                },
            ]
        );

        // Act
        sockets.close("mine-ws-1");

        // Assert
        expect(store.getState().live.channels[0]?.isOpen).toBe(false);
        expect(headerRules.remove).toHaveBeenCalledWith(1_000_000);
        expect(sockets.send("mine-ws-1", "late")).toEqual({
            hasErrors: true,
            error: "This socket isn't open.",
        });
    });
});
