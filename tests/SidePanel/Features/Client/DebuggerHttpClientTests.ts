import { describe, expect, test, vi } from "vitest";
import { Base64Text } from "../../../../src/Common/Encoding/Base64Text";
import { Result } from "../../../../src/Common/Results/Result";
import type { SendClientRequestCommand } from "../../../../src/Contracts/Messaging/Commands/SendClientRequestCommand";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import type { IWorkerConnection } from "../../../../src/SidePanel/Core/WorkerConnection";
import { ClientBodies } from "../../../../src/SidePanel/Features/Client/ClientBodies";
import { ClientBodyType, type ClientRequest } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import { DebuggerHttpClient } from "../../../../src/SidePanel/Features/Client/DebuggerHttpClient";

const Answer = {
    status: 200,
    statusText: "OK",
    headers: [],
    body: "{\"token\":\"x\"}",
    durationInMilliseconds: 9,
};

function aConnection(): IWorkerConnection {
    return {
        send: vi.fn().mockResolvedValue(Result.ok(Answer)) as IWorkerConnection["send"],
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
    };
}

function aRequest(changes: Partial<ClientRequest> = {}): ClientRequest {
    return {
        method: "get",
        url: "https://login.example.com/token",
        headers: [],
        body: ClientBodies.empty(),
        ...changes,
    };
}

function sentCommandOf(connection: IWorkerConnection): SendClientRequestCommand {
    return vi.mocked(connection.send).mock.calls[0]![0] as SendClientRequestCommand;
}

describe("DebuggerHttpClient", () => {
    test("send_WhenAGetHasAForm_ShouldSendItsBytesWithTheFormType", async () => {
        // Arrange
        const connection = aConnection();
        const request = aRequest({
            headers: [
                {
                    name: "Cookie",
                    value: "session=abc",
                },
            ],
            body: {
                ...ClientBodies.empty(),
                type: ClientBodyType.FormUrlEncoded,
                formRows: [
                    {
                        name: "client_id",
                        value: "app",
                    },
                    {
                        name: "scope",
                        value: "api://x/.default",
                    },
                ],
            },
        });

        // Act
        const result = await new DebuggerHttpClient(connection).send(request);

        // Assert
        expect(result).toEqual(Result.ok(Answer));
        expect(sentCommandOf(connection)).toEqual({
            type: PanelCommandType.SendClientRequest,
            request: {
                method: "GET",
                url: "https://login.example.com/token",
                headers: [
                    {
                        name: "Cookie",
                        value: "session=abc",
                    },
                    {
                        name: "Content-Type",
                        value: "application/x-www-form-urlencoded",
                    },
                ],
                bodyBase64: Base64Text.fromUtf8("client_id=app&scope=api%3A%2F%2Fx%2F.default"),
            },
        });
    });

    test("send_WhenTheBodyIsMultipart_ShouldSendTheBoundaryTheBrowserPicked", async () => {
        // Arrange
        const connection = aConnection();
        const request = aRequest({
            body: {
                ...ClientBodies.empty(),
                type: ClientBodyType.Multipart,
                multipartRows: [
                    {
                        name: "note",
                        value: "hello",
                        isFile: false,
                        file: null,
                        fileName: "",
                    },
                ],
            },
        });

        // Act
        await new DebuggerHttpClient(connection).send(request);

        // Assert
        const sent = sentCommandOf(connection).request;
        const contentType = sent.headers.find(header => header.name === "Content-Type")?.value ?? "";
        const boundary = contentType.split("boundary=")[1] ?? "";
        expect(contentType.startsWith("multipart/form-data; boundary=")).toBe(true);
        expect(Base64Text.toUtf8(sent.bodyBase64!)).toContain(`--${boundary}`);
        expect(Base64Text.toUtf8(sent.bodyBase64!)).toContain("hello");
    });

    test("send_WhenThereIsNoBody_ShouldSendNoBytes", async () => {
        // Arrange
        const connection = aConnection();

        // Act
        await new DebuggerHttpClient(connection).send(aRequest());

        // Assert
        expect(sentCommandOf(connection).request.bodyBase64).toBeNull();
    });

    test("send_WhenTheUrlIsInvalid_ShouldNotSend", async () => {
        // Arrange
        const connection = aConnection();

        // Act
        const result = await new DebuggerHttpClient(connection).send(aRequest({
            url: "not a url",
        }));

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "URL is not valid.",
        });
        expect(connection.send).not.toHaveBeenCalled();
    });
});
