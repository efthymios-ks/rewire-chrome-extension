import type { Protocol } from "devtools-protocol";
import type { ILogger } from "../../../Common/Logging/ILogger";
import { Result } from "../../../Common/Results/Result";
import type { ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import type { SentClientRequest } from "../../../Contracts/Messaging/Commands/SendClientRequestCommand";
import { ClientSendPlan } from "./ClientSendPlan";
import type { IPanelTargetClient } from "./IPanelTargetClient";

const RequestPausedEvent = "Fetch.requestPaused";
const NoPanelText = "Open the Rewire side panel to send this request.";
const NoAnswerText = "The panel returned no answer.";
const InterceptEverything: Protocol.Fetch.RequestPattern[] = [
    {
        urlPattern: "*",
        requestStage: "Request",
    },
];

interface SendOutcome {
    status?: number;
    statusText?: string;
    headers?: ClientExchangeResponse["headers"];
    body?: string;
    durationInMilliseconds?: number;
    error?: string;
}

export interface IClientRequestSender {
    send(request: SentClientRequest): Promise<Result<ClientExchangeResponse>>;
}

export class ClientRequestSender implements IClientRequestSender {
    private readonly _client: IPanelTargetClient;
    private readonly _logger: ILogger;
    private readonly _attachedTargets = new Set<string>();
    private readonly _waiting = new Map<string, SentClientRequest>();
    private _inFlight = 0;

    constructor(client: IPanelTargetClient, logger: ILogger) {
        this._client = client;
        this._logger = logger;
    }

    async send(request: SentClientRequest): Promise<Result<ClientExchangeResponse>> {
        const targetId = await this._client.findPanelTarget();
        if (targetId === null) {
            return Result.fail(NoPanelText);
        }

        const attached = await this.ensureAttached(targetId);
        if (attached.hasErrors) {
            return Result.fail(attached.error);
        }

        const sendId = crypto.randomUUID();
        this._waiting.set(sendId, request);
        try {
            const intercepting = await this.startIntercepting(targetId);
            if (intercepting.hasErrors) {
                return Result.fail(intercepting.error);
            }

            return await this.evaluate(
                targetId,
                request,
                sendId
            );
        } finally {
            this._waiting.delete(sendId);
            await this.stopIntercepting(targetId);
        }
    }

    handleEvent(
        targetId: string,
        method: string,
        params: unknown
    ): void {
        if (method !== RequestPausedEvent) {
            return;
        }

        void this.continuePaused(targetId, params as Protocol.Fetch.RequestPausedEvent);
    }

    handleDetach(targetId: string): void {
        this._attachedTargets.delete(targetId);
    }

    private async ensureAttached(targetId: string): Promise<Result<void>> {
        if (this._attachedTargets.has(targetId)) {
            return Result.done();
        }

        const attached = await this._client.attach(targetId);
        if (attached.hasErrors) {
            return attached;
        }

        this._attachedTargets.add(targetId);

        return Result.done();
    }

    private async startIntercepting(targetId: string): Promise<Result<void>> {
        this._inFlight++;
        if (this._inFlight > 1) {
            return Result.done();
        }

        const enabled = await this._client.send(
            targetId,
            "Fetch.enable",
            {
                patterns: InterceptEverything,
            }
        );

        return enabled.hasErrors ? Result.fail(enabled.error) : Result.done();
    }

    private async stopIntercepting(targetId: string): Promise<void> {
        this._inFlight--;
        if (this._inFlight > 0) {
            return;
        }

        const disabled = await this._client.send(targetId, "Fetch.disable");
        if (disabled.hasErrors) {
            this._logger.warn(disabled.error);
        }
    }

    private async evaluate(
        targetId: string,
        request: SentClientRequest,
        sendId: string
    ): Promise<Result<ClientExchangeResponse>> {
        const evaluated = await this._client.send(
            targetId,
            "Runtime.evaluate",
            {
                expression: ClientSendPlan.scriptOf(
                    request.url,
                    sendId,
                    request.bodyBase64 !== null
                ),
                awaitPromise: true,
                returnByValue: true,
            }
        );
        if (evaluated.hasErrors) {
            return Result.fail(evaluated.error);
        }

        const outcome = evaluated.value.result.value as SendOutcome | undefined;
        if (outcome === undefined) {
            return Result.fail(NoAnswerText);
        }

        if (outcome.error !== undefined) {
            return Result.fail(outcome.error);
        }

        return Result.ok({
            status: outcome.status ?? 0,
            statusText: outcome.statusText ?? "",
            headers: outcome.headers ?? [],
            body: outcome.body ?? "",
            durationInMilliseconds: outcome.durationInMilliseconds ?? 0,
        });
    }

    private async continuePaused(targetId: string, event: Protocol.Fetch.RequestPausedEvent): Promise<void> {
        const sendId = ClientSendPlan.markerOf(event.request.headers);
        const request = sendId === null ? undefined : this._waiting.get(sendId);
        if (sendId !== null) {
            this._waiting.delete(sendId);
        }

        const continued = await this._client.send(
            targetId,
            "Fetch.continueRequest",
            request === undefined
                ? {
                    requestId: event.requestId,
                    headers: sendId === null ? undefined : ClientSendPlan.withoutMarker(event.request.headers),
                }
                : {
                    requestId: event.requestId,
                    method: request.method,
                    headers: ClientSendPlan.mergedHeaders(event.request.headers, request.headers),
                    postData: request.bodyBase64 ?? undefined,
                }
        );
        if (continued.hasErrors) {
            this._logger.warn(continued.error);
        }
    }
}
