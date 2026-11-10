import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import type { LogClientExchangeCommand } from "../../../../src/Contracts/Messaging/Commands/LogClientExchangeCommand";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { ClientView } from "../../../../src/SidePanel/Features/Client/ClientView";
import type { IHttpClient } from "../../../../src/SidePanel/Features/Client/HttpClient";
import { aPanelHarness, buttonNamed, click, nextRender, sentOf, typeInto } from "../../PanelTestData";

function anHttpClient(): IHttpClient {
    return {
        send: vi.fn().mockResolvedValue(Result.ok({
            status: 201,
            statusText: "",
            headers: [],
            body: "{\"id\":7}",
            durationInMilliseconds: 12,
        })),
    };
}

const InspectedTab = {
    tabId: 9,
    url: "https://app.example.com/",
    title: "App",
};

describe("ClientView", () => {
    test("send_WhenTheUrlIsEmpty_ShouldAskForOne", async () => {
        // Arrange
        const harness = aPanelHarness();
        const httpClient = anHttpClient();
        const view = new ClientView(harness.context, httpClient);

        // Act
        click(buttonNamed(view.root, "Send"));
        await nextRender();

        // Assert
        expect(httpClient.send).not.toHaveBeenCalled();
        expect(harness.noticeText()).toBe("Enter a URL first.");
    });

    test("send_WhenAnswered_ShouldShowTheStatusAndLogTheExchange", async () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: InspectedTab,
        });
        const view = new ClientView(harness.context, anHttpClient());
        typeInto(view.root.querySelector<HTMLInputElement>(".client-url")!, "https://api.example.com/users");

        // Act
        click(buttonNamed(view.root, "Send"));
        await nextRender();

        // Assert
        expect(view.root.querySelector(".client-response-header")?.textContent).toContain("201 Created");
        const logged = sentOf(harness, PanelCommandType.LogClientExchange) as LogClientExchangeCommand[];
        expect(logged).toHaveLength(1);
        expect(logged[0]?.tabId).toBe(9);
        expect(logged[0]?.request.url).toBe("https://api.example.com/users");
        expect(logged[0]?.response?.status).toBe(201);
    });

    test("clientLaunch_WhenACallIsOpened_ShouldFillTheFormFromIt", async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new ClientView(harness.context, anHttpClient());

        // Act
        harness.context.viewLauncher.openClient({
            method: "PUT",
            url: "https://api.example.com/users/42",
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            body: "{\"name\":\"Ada\"}",
        });
        await nextRender();

        // Assert
        expect(view.root.querySelector<HTMLInputElement>(".client-url")!.value).toBe("https://api.example.com/users/42");
        expect(view.root.querySelector<HTMLSelectElement>(".client-method")!.value).toBe("PUT");
        expect(view.root.querySelector<HTMLTextAreaElement>(".client-body-editor textarea")!.value).toBe("{\"name\":\"Ada\"}");
    });
});
