import { describe, expect, test } from "vitest";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { PostMessageView } from "../../../../src/SidePanel/Features/PostMessages/PostMessageView";
import { aPostMessage } from "../../../TestData";
import { aPanelHarness, buttonNamed, click } from "../../PanelTestData";

const MessagesState = {
    inspectedTab: {
        tabId: 7,
        url: "https://app.example.com/",
        title: "App",
    },
    live: {
        channels: [],
        messages: [],
        postMessages: [
            aPostMessage({
                id: "pm-1",
            }),
            aPostMessage({
                id: "pm-2",
                from: "top",
                to: "chat.example.com",
                origin: "https://app.example.com",
                data: "hello",
                isMine: true,
            }),
        ],
    },
};

describe("PostMessageView", () => {
    test("render_WhenMessagesArrive_ShouldShowFromToAndMarkMine", () => {
        // Arrange
        const harness = aPanelHarness(MessagesState);

        // Act
        const view = new PostMessageView(harness.context);

        // Assert
        expect([...view.root.querySelectorAll(".live-item-title")].map(title => title.textContent)).toEqual([
            "top → chat.example.comSent by you",
            "pay.example.com → top",
        ]);
        expect([...view.root.querySelectorAll<HTMLOptionElement>(".frame-select option")].map(option => option.textContent)).toEqual([
            "All frames",
            "top",
            "pay.example.com",
            "chat.example.com",
        ]);
    });

    test("frameSelect_WhenAFrameIsPicked_ShouldKeepMessagesFromOrToIt", () => {
        // Arrange
        const view = new PostMessageView(aPanelHarness(MessagesState).context);
        const select = view.root.querySelector<HTMLSelectElement>(".frame-select")!;

        // Act
        select.value = "pay.example.com";
        select.dispatchEvent(new Event("change"));

        // Assert
        expect(view.root.querySelectorAll(".live-list .live-item")).toHaveLength(1);
    });

    test("use_WhenClicked_ShouldCopyTheTargetAndDataIntoTheSendBar", () => {
        // Arrange
        const view = new PostMessageView(aPanelHarness(MessagesState).context);
        click(view.root.querySelectorAll(".live-item-head")[0]);

        // Act
        click(buttonNamed(view.root, "Use"));

        // Assert
        expect(view.root.querySelector<HTMLSelectElement>(".post-target")?.value).toBe("chat.example.com");
        expect(view.root.querySelector<HTMLInputElement>(".post-send input")?.value).toBe("hello");
    });

    test("send_WhenSendIsClicked_ShouldAskTheWorkerToPostIt", async () => {
        // Arrange
        const harness = aPanelHarness(MessagesState);
        const view = new PostMessageView(harness.context);
        view.root.querySelector<HTMLSelectElement>(".post-target")!.value = "pay.example.com";
        view.root.querySelector<HTMLInputElement>(".post-send input")!.value = "{\"type\":\"ping\"}";

        // Act
        click(buttonNamed(view.root, "Send"));
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assert
        expect(harness.sent).toContainEqual({
            type: PanelCommandType.SendPostMessage,
            tabId: 7,
            target: "pay.example.com",
            data: "{\"type\":\"ping\"}",
        });
    });

    test("send_WhenNotListening_ShouldSayWhereToSeeIt", async () => {
        // Arrange
        const harness = aPanelHarness(MessagesState);
        const view = new PostMessageView(harness.context);
        view.root.querySelector<HTMLInputElement>(".post-send input")!.value = "hello";

        // Act
        click(buttonNamed(view.root, "Send"));
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assert
        expect(harness.noticeText()).toBe("Sent. Listen to page messages to see it.");
    });
});
