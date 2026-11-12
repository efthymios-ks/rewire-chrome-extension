import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import { ClientBodies } from "../../../../src/SidePanel/Features/Client/ClientBodies";
import { ClientBodyType, type ClientRequest } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import type { IHttpClient } from "../../../../src/SidePanel/Features/Client/HttpClient";
import { RoutedHttpClient } from "../../../../src/SidePanel/Features/Client/RoutedHttpClient";

function aClient(): IHttpClient {
    return {
        send: vi.fn().mockResolvedValue(Result.done()),
    };
}

function aRequest(changes: Partial<ClientRequest> = {}): ClientRequest {
    return {
        method: "GET",
        url: "https://api.example.com/users",
        headers: [],
        body: ClientBodies.empty(),
        ...changes,
    };
}

describe("RoutedHttpClient", () => {
    test("send_WhenTheBrowserCanSendIt_ShouldUseFetch", async () => {
        // Arrange
        const browser = aClient();
        const viaDebugger = aClient();
        const request = aRequest();

        // Act
        await new RoutedHttpClient(browser, viaDebugger).send(request);

        // Assert
        expect(browser.send).toHaveBeenCalledWith(request);
        expect(viaDebugger.send).not.toHaveBeenCalled();
    });

    test("send_WhenAGetCarriesABody_ShouldGoThroughTheDebugger", async () => {
        // Arrange
        const browser = aClient();
        const viaDebugger = aClient();
        const request = aRequest({
            body: {
                ...ClientBodies.empty(),
                type: ClientBodyType.Json,
                text: "{}",
            },
        });

        // Act
        await new RoutedHttpClient(browser, viaDebugger).send(request);

        // Assert
        expect(viaDebugger.send).toHaveBeenCalledWith(request);
        expect(browser.send).not.toHaveBeenCalled();
    });
});
