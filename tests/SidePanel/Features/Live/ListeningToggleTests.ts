import { describe, expect, test } from "vitest";
import { NoLiveListening } from "../../../../src/Contracts/Live/LiveListening";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { ListeningToggle } from "../../../../src/SidePanel/Features/Live/ListeningToggle";
import { aPanelHarness, nextRender, sentOf } from "../../PanelTestData";

const InspectedTab = {
    tabId: 7,
    url: "https://app.example.com/",
    title: "App",
};

describe("ListeningToggle", () => {
    test("build_WhenThePanelOpens_ShouldBeOffAndNameWhatItCaptures", () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const toggle = ListeningToggle.build(harness.context, "webSockets");

        // Assert
        expect(toggle.querySelector<HTMLInputElement>("input")?.checked).toBe(false);
        expect(toggle.textContent).toBe("Listen to page sockets");
        expect(toggle.title).toContain("WebSockets of the inspected tab");
    });

    test("change_WhenTurnedOn_ShouldListenAndTellTheWorker", async () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: InspectedTab,
        });
        const toggle = ListeningToggle.build(harness.context, "eventStreams");
        const input = toggle.querySelector<HTMLInputElement>("input")!;

        // Act
        input.checked = true;
        input.dispatchEvent(new Event("change"));
        await nextRender();

        // Assert
        expect(input.checked).toBe(true);
        expect(sentOf(harness, PanelCommandType.SetLiveListening)).toEqual([
            {
                type: PanelCommandType.SetLiveListening,
                tabId: 7,
                listening: {
                    ...NoLiveListening,
                    eventStreams: true,
                },
            },
        ]);
    });

    test("send_WhenNoTabIsInspected_ShouldSendNothing", async () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const result = await ListeningToggle.send(harness.store, harness.context.connection);

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(harness.sent).toEqual([]);
    });
});
