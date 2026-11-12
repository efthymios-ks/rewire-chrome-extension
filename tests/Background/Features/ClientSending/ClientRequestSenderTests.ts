import { describe, expect, test, vi } from "vitest";
import { ClientRequestSender } from "../../../../src/Background/Features/ClientSending/ClientRequestSender";
import type { IPanelTargetClient } from "../../../../src/Background/Features/ClientSending/IPanelTargetClient";
import { Result } from "../../../../src/Common/Results/Result";
import type { SentClientRequest } from "../../../../src/Contracts/Messaging/Commands/SendClientRequestCommand";
import { createLogger } from "../../BackgroundTestData";

const PanelTarget = "panel-target";
const MarkerPattern = /"x-rewire-send":"([^"]+)"/;

interface SentCommand {
    command: string;
    params: Record<string, unknown> | undefined;
}

interface SenderSetUp {
    sender: ClientRequestSender;
    client: IPanelTargetClient;
    sent: SentCommand[];
}

function aRequest(changes: Partial<SentClientRequest> = {}): SentClientRequest {
    return {
        method: "GET",
        url: "https://login.example.com/token",
        headers: [
            {
                name: "Content-Type",
                value: "application/x-www-form-urlencoded",
            },
            {
                name: "Cookie",
                value: "session=abc",
            },
        ],
        bodyBase64: btoa("client_id=app&grant_type=client_credentials"),
        ...changes,
    };
}

function setUp(evaluation: unknown = {
    status: 200,
    statusText: "OK",
    headers: [
        {
            name: "content-type",
            value: "application/json",
        },
    ],
    body: "{\"access_token\":\"x\"}",
    durationInMilliseconds: 42,
}, target: string | null = PanelTarget): SenderSetUp {
    const sent: SentCommand[] = [];
    let sender: ClientRequestSender | null = null;
    const client: IPanelTargetClient = {
        findPanelTarget: vi.fn().mockResolvedValue(target),
        attach: vi.fn().mockResolvedValue(Result.done()),
        send: vi.fn(async (_targetId: string, command: string, params?: Record<string, unknown>) => {
            sent.push({
                command,
                params,
            });
            if (command !== "Runtime.evaluate") {
                return Result.ok({});
            }

            const sendId = MarkerPattern.exec(String(params?.["expression"]))?.[1] ?? "";
            sender!.handleEvent(
                PanelTarget,
                "Fetch.requestPaused",
                {
                    requestId: "paused-1",
                    request: {
                        headers: {
                            "Accept": "*/*",
                            "Content-Type": "text/plain;charset=UTF-8",
                            "x-rewire-send": sendId,
                        },
                    },
                }
            );
            await new Promise(resolve => setTimeout(resolve, 0));

            return Result.ok({
                result: {
                    value: evaluation,
                },
            });
        }) as IPanelTargetClient["send"],
    };
    sender = new ClientRequestSender(client, createLogger());

    return {
        sender,
        client,
        sent,
    };
}

function commandsOf(sent: SentCommand[]): string[] {
    return sent.map(entry => entry.command);
}

describe("ClientRequestSender", () => {
    test("send_WhenAGetHasABody_ShouldRewriteThePausedRequestAndReturnTheAnswer", async () => {
        // Arrange
        const { sender, sent } = setUp();
        const request = aRequest();

        // Act
        const result = await sender.send(request);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: {
                status: 200,
                statusText: "OK",
                headers: [
                    {
                        name: "content-type",
                        value: "application/json",
                    },
                ],
                body: "{\"access_token\":\"x\"}",
                durationInMilliseconds: 42,
            },
        });
        expect(commandsOf(sent)).toEqual([
            "Fetch.enable",
            "Runtime.evaluate",
            "Fetch.continueRequest",
            "Fetch.disable",
        ]);
        expect(sent[2]?.params).toEqual({
            requestId: "paused-1",
            method: "GET",
            headers: [
                {
                    name: "Accept",
                    value: "*/*",
                },
                {
                    name: "Content-Type",
                    value: "application/x-www-form-urlencoded",
                },
                {
                    name: "Cookie",
                    value: "session=abc",
                },
            ],
            postData: request.bodyBase64,
        });
    });

    test("send_WhenSentTwice_ShouldAttachToThePanelOnce", async () => {
        // Arrange
        const { sender, client } = setUp();
        await sender.send(aRequest());

        // Act
        await sender.send(aRequest());

        // Assert
        expect(client.attach).toHaveBeenCalledOnce();
        expect(client.attach).toHaveBeenCalledWith(PanelTarget);
    });

    test("send_WhenThePanelWasDetached_ShouldAttachAgain", async () => {
        // Arrange
        const { sender, client } = setUp();
        await sender.send(aRequest());
        sender.handleDetach(PanelTarget);

        // Act
        await sender.send(aRequest());

        // Assert
        expect(client.attach).toHaveBeenCalledTimes(2);
    });

    test("send_WhenNoPanelIsOpen_ShouldSaySo", async () => {
        // Arrange
        const { sender } = setUp(undefined, null);

        // Act
        const result = await sender.send(aRequest());

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "Open the Rewire side panel to send this request.",
        });
    });

    test("send_WhenThePanelCannotBeAttached_ShouldReturnWhy", async () => {
        // Arrange
        const { sender, client } = setUp();
        vi.mocked(client.attach).mockResolvedValue(Result.fail("Another debugger is already attached."));

        // Act
        const result = await sender.send(aRequest());

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "Another debugger is already attached.",
        });
    });

    test("send_WhenTheRequestFails_ShouldReturnTheBrowserError", async () => {
        // Arrange
        const { sender } = setUp({
            error: "Failed to fetch",
        });

        // Act
        const result = await sender.send(aRequest());

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "Failed to fetch",
        });
    });

    test("handleEvent_WhenAnotherPanelRequestPauses_ShouldLetItGoUnchanged", async () => {
        // Arrange
        const { sender, sent } = setUp();

        // Act
        sender.handleEvent(
            PanelTarget,
            "Fetch.requestPaused",
            {
                requestId: "other-1",
                request: {
                    headers: {
                        Accept: "*/*",
                    },
                },
            }
        );
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assert
        expect(sent).toEqual([
            {
                command: "Fetch.continueRequest",
                params: {
                    requestId: "other-1",
                    headers: undefined,
                },
            },
        ]);
    });

    test("handleEvent_WhenTheEventIsNotAPausedRequest_ShouldIgnoreIt", () => {
        // Arrange
        const { sender, sent } = setUp();

        // Act
        sender.handleEvent(
            PanelTarget,
            "Network.requestWillBeSent",
            {}
        );

        // Assert
        expect(sent).toEqual([]);
    });
});
