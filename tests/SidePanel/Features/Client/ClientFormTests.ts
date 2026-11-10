import { describe, expect, test, vi } from "vitest";
import { ClientBodies } from "../../../../src/SidePanel/Features/Client/ClientBodies";
import { ClientForm } from "../../../../src/SidePanel/Features/Client/ClientForm";
import { ClientBodyType, type ClientRequest } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import { typeInto } from "../../PanelTestData";

function aRequest(changes: Partial<ClientRequest> = {}): ClientRequest {
    return {
        method: "GET",
        url: "",
        headers: [],
        body: ClientBodies.empty(),
        ...changes,
    };
}

function paste(input: HTMLInputElement, text: string): Event {
    const event = new Event("paste", {
        bubbles: true,
        cancelable: true,
    });
    Object.defineProperty(event, "clipboardData", {
        value: {
            getData: () => text,
        },
    });
    input.dispatchEvent(event);

    return event;
}

function visibleSuggestions(wrapper: Element): string[] {
    const list = wrapper.querySelector<HTMLElement>(".suggestion-list")!;

    return list.hidden ? [] : [...list.querySelectorAll(".suggestion-item")].map(item => item.textContent ?? "");
}

describe("ClientForm", () => {
    test("paste_WhenTheTextIsACurlCommand_ShouldFillTheFormAndSaySo", () => {
        // Arrange
        const onPasteFilled = vi.fn();
        const form = new ClientForm({
            initial: aRequest(),
            onPasteFilled,
        });
        const url = form.root.querySelector<HTMLInputElement>(".client-url")!;

        // Act
        const event = paste(url, "curl https://api.example.com/users -H 'Accept: application/json' --json '{\"a\":1}'");

        // Assert
        const request = form.current();
        expect(event.defaultPrevented).toBe(true);
        expect(onPasteFilled).toHaveBeenCalledOnce();
        expect(request.method).toBe("POST");
        expect(request.url).toBe("https://api.example.com/users");
        expect(request.body.type).toBe(ClientBodyType.Json);
        expect(form.root.querySelector<HTMLSelectElement>(".client-method")!.value).toBe("POST");
    });

    test("paste_WhenTheTextIsAPlainUrl_ShouldLetTheBrowserPasteIt", () => {
        // Arrange
        const onPasteFilled = vi.fn();
        const form = new ClientForm({
            initial: aRequest(),
            onPasteFilled,
        });

        // Act
        const event = paste(form.root.querySelector<HTMLInputElement>(".client-url")!, "https://api.example.com/users");

        // Assert
        expect(event.defaultPrevented).toBe(false);
        expect(onPasteFilled).not.toHaveBeenCalled();
    });

    test("headerValue_WhenTheNameChanges_ShouldFollowItsSuggestions", () => {
        // Arrange
        const form = new ClientForm({
            initial: aRequest(),
            onPasteFilled: vi.fn(),
        });
        const nameInput = form.root.querySelector<HTMLInputElement>(".client-row-name input")!;
        const valueWrapper = form.root.querySelector(".client-row-value")!;
        const valueInput = valueWrapper.querySelector<HTMLInputElement>("input")!;

        // Act
        typeInto(nameInput, "Authorization");
        typeInto(valueInput, "a");
        const forAuthorization = visibleSuggestions(valueWrapper);
        typeInto(nameInput, "Content-Type");
        typeInto(valueInput, "application/js");
        const forContentType = visibleSuggestions(valueWrapper);

        // Assert
        expect(forAuthorization).toEqual([]);
        expect(forContentType).toContain("application/json");
    });

    test("fill_WhenGivenAnUnusualMethod_ShouldAddItToTheChoices", () => {
        // Arrange
        const form = new ClientForm({
            initial: aRequest(),
            onPasteFilled: vi.fn(),
        });

        // Act
        form.fill(aRequest({
            method: "propfind",
            url: "https://dav.example.com/",
            headers: [
                {
                    name: "Depth",
                    value: "1",
                },
            ],
        }));

        // Assert
        expect(form.current()).toMatchObject({
            method: "PROPFIND",
            url: "https://dav.example.com/",
            headers: [
                {
                    name: "Depth",
                    value: "1",
                },
            ],
        });
        expect(form.root.querySelector<HTMLSelectElement>(".client-method")!.value).toBe("PROPFIND");
    });
});
