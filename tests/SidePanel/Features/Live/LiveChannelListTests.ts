import { describe, expect, test, vi } from "vitest";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { LiveChannelList } from "../../../../src/SidePanel/Features/Live/LiveChannelList";
import { aChannel } from "../../../TestData";
import { click } from "../../PanelTestData";

function aList() {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const onRemove = vi.fn();
    const list = new LiveChannelList({
        emptyText: "No sockets yet.",
        closeTitle: "Close this socket",
        removeTitle: "Remove this socket",
        onSelect,
        onClose,
        onRemove,
    });

    return {
        list,
        onSelect,
        onClose,
        onRemove,
    };
}

describe("LiveChannelList", () => {
    test("update_WhenChannelsExist_ShouldShowStateOwnerAddressAndCount", () => {
        // Arrange
        const { list } = aList();

        // Act
        list.update(
            [
                {
                    channel: aChannel(
                        "ws-1",
                        LiveChannelKind.WebSocket,
                        false
                    ),
                    count: 3,
                },
            ],
            null
        );

        // Assert
        const row = list.root.querySelector(".live-channel")!;
        expect(row.querySelector(".live-dot")?.classList.contains("open")).toBe(false);
        expect(row.querySelector(".tag")?.textContent).toBe("Page");
        expect(row.querySelector(".live-channel-address")?.textContent).toBe("live.example.com/socket");
        expect(row.querySelector(".live-channel-count")?.textContent).toBe("3");
        expect(row.querySelector("[title='Close this socket']")).toBeNull();
        expect(row.querySelector("[title='Remove this socket']")).not.toBeNull();
    });

    test("update_WhenMySocketIsOpen_ShouldOfferToCloseIt", () => {
        // Arrange
        const { list, onClose, onSelect } = aList();
        list.update(
            [
                {
                    channel: aChannel(
                        "mine-ws-1",
                        LiveChannelKind.WebSocket,
                        true,
                        {
                            isMine: true,
                        }
                    ),
                    count: 0,
                },
            ],
            "mine-ws-1"
        );

        // Act
        click(list.root.querySelector("[title='Close this socket']"));
        click(list.root.querySelector(".live-channel-pick"));

        // Assert
        expect(onClose).toHaveBeenCalledWith("mine-ws-1");
        expect(onSelect).toHaveBeenCalledWith("mine-ws-1");
        expect(list.root.querySelector(".live-channel")?.classList.contains("selected")).toBe(true);
    });

    test("update_WhenAPageSocketIsOpen_ShouldOfferNoButton", () => {
        // Arrange
        const { list } = aList();

        // Act
        list.update(
            [
                {
                    channel: aChannel("ws-1"),
                    count: 0,
                },
            ],
            null
        );

        // Assert
        expect(list.root.querySelector("[title='Close this socket']")).toBeNull();
        expect(list.root.querySelector("[title='Remove this socket']")).toBeNull();
    });

    test("remove_WhenAClosedSocketsButtonIsClicked_ShouldAskToRemoveIt", () => {
        // Arrange
        const { list, onRemove } = aList();
        list.update(
            [
                {
                    channel: aChannel(
                        "ws-1",
                        LiveChannelKind.WebSocket,
                        false
                    ),
                    count: 2,
                },
            ],
            null
        );

        // Act
        click(list.root.querySelector("[title='Remove this socket']"));

        // Assert
        expect(onRemove).toHaveBeenCalledWith("ws-1");
    });
});
