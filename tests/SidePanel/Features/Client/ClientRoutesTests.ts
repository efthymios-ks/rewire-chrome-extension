import { describe, expect, test } from "vitest";
import { ClientBodies } from "../../../../src/SidePanel/Features/Client/ClientBodies";
import { ClientBodyType, type ClientRequest } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import { ClientRoutes } from "../../../../src/SidePanel/Features/Client/ClientRoutes";

function aRequest(changes: Partial<ClientRequest> = {}): ClientRequest {
    return {
        method: "GET",
        url: "https://api.example.com/users",
        headers: [],
        body: ClientBodies.empty(),
        ...changes,
    };
}

const TextBody = {
    ...ClientBodies.empty(),
    type: ClientBodyType.Text,
    text: "hello",
};

describe("ClientRoutes", () => {
    test.each([
        [
            "a plain GET",
            aRequest(),
            false,
        ],
        [
            "a GET with a body",
            aRequest({
                body: TextBody,
            }),
            true,
        ],
        [
            "a POST with a body",
            aRequest({
                method: "POST",
                body: TextBody,
            }),
            false,
        ],
        [
            "a Cookie header",
            aRequest({
                headers: [
                    {
                        name: " cookie ",
                        value: "session=abc",
                    },
                ],
            }),
            true,
        ],
        [
            "a User-Agent header",
            aRequest({
                headers: [
                    {
                        name: "User-Agent",
                        value: "Rewire",
                    },
                ],
            }),
            true,
        ],
        [
            "an empty Cookie header",
            aRequest({
                headers: [
                    {
                        name: "Cookie",
                        value: "",
                    },
                ],
            }),
            false,
        ],
        [
            "an ordinary header",
            aRequest({
                headers: [
                    {
                        name: "Authorization",
                        value: "Bearer x",
                    },
                ],
            }),
            false,
        ],
    ])("needsDebugger_WhenTheRequestHas(%s)_ShouldReturn(%s)", (_case, request, expected) => {
        // Arrange
        const candidate = request;

        // Act
        const needsDebugger = ClientRoutes.needsDebugger(candidate);

        // Assert
        expect(needsDebugger).toBe(expected);
    });

    test("bodySent_WhenAGetGoesThroughTheDebugger_ShouldKeepTheBody", () => {
        // Arrange
        const request = aRequest({
            body: TextBody,
        });

        // Act
        const body = ClientRoutes.bodySent(request);

        // Assert
        expect(body).toBe(TextBody);
    });

    test("bodySent_WhenAHeadGoesThroughTheBrowserWithoutABody_ShouldBeEmpty", () => {
        // Arrange
        const request = aRequest({
            method: "HEAD",
        });

        // Act
        const body = ClientRoutes.bodySent(request);

        // Assert
        expect(body.type).toBe(ClientBodyType.None);
    });
});
