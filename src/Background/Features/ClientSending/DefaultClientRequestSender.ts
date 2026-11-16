import type { Protocol } from 'devtools-protocol';
import type { Logger } from '../../../Common/Logging/Logger';
import { Result } from '../../../Common/Results/Result';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import type { SentClientRequest } from '../../../Contracts/Messaging/Commands/SentClientRequest';
import type { ClientRequestSender } from './ClientRequestSender';
import { ClientSendPlan } from './ClientSendPlan';
import type { PanelTargetClient } from './PanelTargetClient';

const REQUEST_PAUSED_EVENT = 'Fetch.requestPaused';
const NO_PANEL_TEXT = 'Open the Rewire side panel to send this request.';
const NO_ANSWER_TEXT = 'The panel returned no answer.';
const INTERCEPT_EVERYTHING: Protocol.Fetch.RequestPattern[] = [
    {
        urlPattern: '*',
        requestStage: 'Request',
    },
];

interface SendOutcome {
    status?: number;
    statusText?: string;
    headers?: ClientExchangeResponse['headers'];
    body?: string;
    durationInMilliseconds?: number;
    error?: string;
}

interface TargetInterception {
    sendCount: number;
    enabled: Promise<Result<void>>;
}

export interface EvaluateAsyncOptions {
    targetId: string;
    request: SentClientRequest;
    sendId: string;
}

export class DefaultClientRequestSender implements ClientRequestSender {
    private readonly _client: PanelTargetClient;
    private readonly _logger: Logger;
    private readonly _attachedTargets = new Set<string>();
    private readonly _waiting = new Map<string, SentClientRequest>();
    private readonly _interceptions = new Map<string, TargetInterception>();

    constructor(client: PanelTargetClient, logger: Logger) {
        this._client = client;
        this._logger = logger;
    }

    async sendAsync(request: SentClientRequest): Promise<Result<ClientExchangeResponse>> {
        const found = await this._client.findPanelTargetAsync();
        if (found.hasErrors) {
            return found;
        }

        const targetId = found.value;
        if (targetId == null) {
            return Result.fail(NO_PANEL_TEXT);
        }

        const attached = await this.ensureAttachedAsync(targetId);
        if (attached.hasErrors) {
            return Result.fail(attached.error);
        }

        const sendId = crypto.randomUUID();
        this._waiting.set(sendId, request);
        try {
            const intercepting = await this.startInterceptingAsync(targetId);
            if (intercepting.hasErrors) {
                return Result.fail(intercepting.error);
            }

            return await this.evaluateAsync({ targetId, request, sendId });
        } finally {
            this._waiting.delete(sendId);
            await this.stopInterceptingAsync(targetId);
        }
    }

    handleEvent(
        targetId: string,
        method: string,
        params: unknown,
    ): void {
        if (method !== REQUEST_PAUSED_EVENT) {
            return;
        }

        void this.continuePausedAsync(targetId, params as Protocol.Fetch.RequestPausedEvent);
    }

    handleDetach(targetId: string): void {
        this._attachedTargets.delete(targetId);
    }

    private async ensureAttachedAsync(targetId: string): Promise<Result<void>> {
        if (this._attachedTargets.has(targetId)) {
            return Result.done();
        }

        const attached = await this._client.attachAsync(targetId);
        if (attached.hasErrors) {
            return attached;
        }

        this._attachedTargets.add(targetId);

        return Result.done();
    }

    private startInterceptingAsync(targetId: string): Promise<Result<void>> {
        const interception = this._interceptions.get(targetId);
        if (interception != null) {
            interception.sendCount++;

            return interception.enabled;
        }

        const enabled = this.enableInterceptionAsync(targetId);
        this._interceptions.set(
            /* key: */ targetId,
            /* value: */ {
                sendCount: 1,
                enabled,
            },
        );

        return enabled;
    }

    private async enableInterceptionAsync(targetId: string): Promise<Result<void>> {
        const enabled = await this._client.sendAsync(
            /* targetId: */ targetId,
            /* command: */ 'Fetch.enable',
            /* params: */ {
                patterns: INTERCEPT_EVERYTHING,
            },
        );

        return enabled.hasErrors ? Result.fail(enabled.error) : Result.done();
    }

    private async stopInterceptingAsync(targetId: string): Promise<void> {
        const interception = this._interceptions.get(targetId);
        if (interception == null) {
            return;
        }

        interception.sendCount--;
        if (interception.sendCount > 0) {
            return;
        }

        this._interceptions.delete(targetId);
        const disabled = await this._client.sendAsync(targetId, 'Fetch.disable');
        if (disabled.hasErrors) {
            this._logger.warn(disabled.error);
        }
    }

    private async evaluateAsync({
        targetId,
        request,
        sendId,
    }: EvaluateAsyncOptions): Promise<Result<ClientExchangeResponse>> {
        const evaluated = await this._client.sendAsync(
            /* targetId: */ targetId,
            /* command: */ 'Runtime.evaluate',
            /* params: */ {
                expression: ClientSendPlan.scriptOf({
                    url: request.url,
                    sendId,
                    hasBody: request.bodyBase64 != null,
                }),
                awaitPromise: true,
                returnByValue: true,
            },
        );
        if (evaluated.hasErrors) {
            return Result.fail(evaluated.error);
        }

        const outcome = evaluated.value.result.value as SendOutcome | undefined;
        if (outcome == null) {
            return Result.fail(NO_ANSWER_TEXT);
        }

        if (outcome.error != null) {
            return Result.fail(outcome.error);
        }

        return Result.ok({
            status: outcome.status ?? 0,
            statusText: outcome.statusText ?? '',
            headers: outcome.headers ?? [],
            body: outcome.body ?? '',
            durationInMilliseconds: outcome.durationInMilliseconds ?? 0,
        });
    }

    private async continuePausedAsync(
        targetId: string,
        event: Protocol.Fetch.RequestPausedEvent,
    ): Promise<void> {
        const sendId = ClientSendPlan.markerOf(event.request.headers);
        const request = sendId == null ? undefined : this._waiting.get(sendId);
        if (sendId != null) {
            this._waiting.delete(sendId);
        }

        const continued = await this._client.sendAsync(
            /* targetId: */ targetId,
            /* command: */ 'Fetch.continueRequest',
            /* params: */ request == null
                ? {
                    requestId: event.requestId,
                    headers: sendId == null ? undefined : ClientSendPlan.withoutMarker(event.request.headers),
                }
                : {
                    requestId: event.requestId,
                    method: request.method,
                    headers: ClientSendPlan.mergedHeaders(event.request.headers, request.headers),
                    postData: request.bodyBase64 ?? undefined,
                },
        );
        if (continued.hasErrors) {
            this._logger.warn(continued.error);
        }
    }
}
