import { afterEach, describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import type { IFileClient } from "../../../../src/SidePanel/Core/FileClient";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { HarInspectorView } from "../../../../src/SidePanel/Features/HarInspector/HarInspectorView";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../PanelTestData";

const HarText = JSON.stringify({
    log: {
        version: "1.2",
        entries: [
            {
                startedDateTime: "2026-11-12T10:00:00.000Z",
                time: 80,
                request: {
                    method: "GET",
                    url: "https://api.example.com/users/42",
                    headers: [],
                },
                response: {
                    status: 200,
                    statusText: "OK",
                    headers: [],
                    content: {
                        mimeType: "application/json",
                        text: "{\"id\":42}",
                    },
                },
            },
            {
                startedDateTime: "2026-11-12T10:00:01.000Z",
                time: 40,
                request: {
                    method: "POST",
                    url: "https://api.example.com/orders",
                    headers: [],
                },
                response: {
                    status: 500,
                    statusText: "Internal Server Error",
                    headers: [],
                    content: {
                        mimeType: "application/json",
                        text: "{}",
                    },
                },
            },
        ],
    },
});

function paste(target: EventTarget, text: string): Event {
    const event = new Event("paste", {
        bubbles: true,
        cancelable: true,
    });
    Object.defineProperty(event, "clipboardData", {
        value: {
            getData: () => text,
        },
    });
    target.dispatchEvent(event);

    return event;
}

function aFileClient(picked: { name: string; text: string } | null): IFileClient {
    return {
        download: vi.fn(),
        pickText: vi.fn(),
        pickNamedText: vi.fn().mockResolvedValue(Result.ok(picked)),
    };
}

describe("HarInspectorView", () => {
    afterEach(async () => {
        await nextRender();
        document.body.replaceChildren();
    });

    test("constructor_WhenNoFileIsOpen_ShouldShowTheDropArea", () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const view = new HarInspectorView(harness.context, aFileClient(null));

        // Assert
        expect(view.root.querySelector(".drop-zone")?.textContent).toContain("Drop a .har file here, or paste one");
        expect(view.root.querySelector(".drop-zone button")).toBeNull();
        expect(buttonNamed(view.root, "Close file").hidden).toBe(true);
    });

    test("open_WhenTheFileIsValid_ShouldShowItsCallsWithoutLiveActions", async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView(harness.context, aFileClient(null));

        // Act
        view.open("staging.har", HarText);
        await nextRender();

        // Assert
        expect(view.root.querySelector(".har-file-name")?.textContent).toBe("staging.har · 2 entries");
        expect(view.root.querySelectorAll(".timeline-row")).toHaveLength(2);
        expect(view.root.querySelector(".pin-toggle")).toBeNull();
        expect([...view.root.querySelectorAll(".traffic-toolbar button")].map(button => button.textContent)).not.toContain("HAR");
        expect([...view.root.querySelectorAll(".traffic-toolbar button")].map(button => button.textContent)).not.toContain("Clear");
        expect(harness.store.getState().entries).toEqual([]);
    });

    test("open_WhenACallIsPicked_ShouldHideMockThisAndPin", async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView(harness.context, aFileClient(null));
        view.open("staging.har", HarText);
        await nextRender();

        // Act
        click(view.root.querySelector(".timeline-row"));
        await new Promise(resolve => setTimeout(resolve, 250));

        // Assert
        const actions = [...view.root.querySelectorAll(".general-tab .actions button")].map(button => button.textContent);
        expect(actions).toEqual(["Copy URL"]);
    });

    test("openHar_WhenAFileIsPicked_ShouldOpenIt", async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView(harness.context, aFileClient({
            name: "picked.har",
            text: HarText,
        }));

        // Act
        click(buttonNamed(view.root.querySelector(".har-header")!, "Open .har"));
        await nextRender();

        // Assert
        expect(view.root.querySelector(".har-file-name")?.textContent).toBe("picked.har · 2 entries");
        expect(buttonNamed(view.root, "Close file").hidden).toBe(false);
    });

    test("open_WhenTheFileIsInvalid_ShouldSayWhyAndKeepTheView", () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView(harness.context, aFileClient(null));

        // Act
        view.open("broken.har", "{ nope");

        // Assert
        expect(harness.noticeText()).toBe("Can't open broken.har: it isn't valid JSON.");
        expect(view.root.querySelector(".drop-zone")).not.toBeNull();
    });

    test("closeFile_WhenClicked_ShouldGoBackToTheDropArea", async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView(harness.context, aFileClient(null));
        view.open("staging.har", HarText);
        await nextRender();

        // Act
        click(buttonNamed(view.root, "Close file"));

        // Assert
        expect(view.root.querySelector(".drop-zone")).not.toBeNull();
        expect(view.root.querySelector(".har-file-name")?.textContent).toBe("");
    });

    test("paste_WhenHarTextIsPastedOnTheTab_ShouldOpenIt", async () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: ViewId.HarInspector,
        });
        const view = new HarInspectorView(harness.context, aFileClient(null));
        document.body.append(view.root);

        // Act
        const event = paste(document.body, HarText);
        await nextRender();

        // Assert
        expect(event.defaultPrevented).toBe(true);
        expect(view.root.querySelector(".har-file-name")?.textContent).toBe("Pasted HAR · 2 entries");
    });

    test("paste_WhenAnotherTabIsOpen_ShouldIgnoreIt", () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView(harness.context, aFileClient(null));
        document.body.append(view.root);

        // Act
        paste(document.body, HarText);

        // Assert
        expect(view.root.querySelector(".drop-zone")).not.toBeNull();
        expect(harness.noticeText()).toBe("");
    });

    test("paste_WhenPastingIntoAField_ShouldLeaveItToTheField", async () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: ViewId.HarInspector,
        });
        const view = new HarInspectorView(harness.context, aFileClient(null));
        view.open("staging.har", HarText);
        document.body.append(view.root);
        await nextRender();

        // Act
        const event = paste(view.root.querySelector("input")!, "grace");

        // Assert
        expect(event.defaultPrevented).toBe(false);
        expect(view.root.querySelector(".har-file-name")?.textContent).toBe("staging.har · 2 entries");
    });

    test("paste_WhenThePastedTextIsNotHar_ShouldSayWhy", () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: ViewId.HarInspector,
        });
        const view = new HarInspectorView(harness.context, aFileClient(null));
        document.body.append(view.root);

        // Act
        paste(document.body, "hello");

        // Assert
        expect(harness.noticeText()).toBe("Can't open Pasted HAR: it isn't valid JSON.");
    });
});
