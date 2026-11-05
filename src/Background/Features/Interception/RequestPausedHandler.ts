import type { Protocol } from "devtools-protocol";
import { delay } from "../../../Common/Async/Delay";
import { Base64Text } from "../../../Common/Encoding/Base64Text";
import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import { TextualMime } from "../../../Common/Http/TextualMime";
import type { ILogger } from "../../../Common/Logging/ILogger";
import type { Result } from "../../../Common/Results/Result";
import type { RequestDraft, SyntheticResponse } from "../../../Common/Rules/Drafts/Drafts";
import { HeaderList } from "../../../Common/Rules/Http/HeaderList";
import { CorsHeaders } from "../../../Common/Rules/Types/Headers/CorsHeaders";
import { type AppliedStep, RulePipeline } from "../../../Common/Rules/Engine/RulePipeline";
import { HeaderNames } from "../../../Contracts/Http/HeaderNames";
import { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { ITimelineStore } from "../Capture/ITimelineStore";
import type { IPendingDocuments } from "../Capture/PendingDocuments";
import { TimelineAnnotations } from "../Capture/TimelineAnnotations";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";
import type { IActiveRules } from "../Rules/ActiveRules";
import type { IRuleHitCounter } from "../Rules/RuleHitCounter";
import { StepAnnotations } from "../Rules/StepAnnotations";
import { PausedDrafts } from "./PausedDrafts";
import { PendingResponses } from "./PendingResponses";

interface RuleAnswer {
    steps: AppliedStep[];
    request: RequestDraft;
    response: SyntheticResponse;
}

const ReleasedByBrowserErrors = [
    "Fetch domain is not enabled",
    "Invalid InterceptionId",
];

interface RawBody {
    data: string;
    isBase64: boolean;
}

export interface RequestPausedDependencies {
    activeRules: IActiveRules;
    debuggerClient: IDebuggerClient;
    timelineStore: ITimelineStore;
    pendingDocuments: IPendingDocuments;
    hitCounter: IRuleHitCounter;
    logger: ILogger;
}

function isResponseStage(event: Protocol.Fetch.RequestPausedEvent): boolean {
    return event.responseStatusCode !== undefined || event.responseErrorReason !== undefined;
}

function isReleasedByBrowser(error: string): boolean {
    return ReleasedByBrowserErrors.some(message => error.includes(message));
}

function hasChanges(steps: AppliedStep[]): boolean {
    return steps.some(step => step.changes.length > 0);
}

function headersOf(draft: RequestDraft, original: RequestDraft): HeaderEntry[] | undefined {
    return JSON.stringify(draft.headers) === JSON.stringify(original.headers) ? undefined : draft.headers;
}

const RecomputedHeaders = [
    HeaderNames.ContentEncoding,
    HeaderNames.ContentLength,
];

function deliverableHeaders(headers: HeaderEntry[]): HeaderEntry[] {
    return RecomputedHeaders.reduce((current, name) => HeaderList.remove(current, name), headers);
}

function textOf(raw: RawBody | null, headers: HeaderEntry[]): string | null {
    const contentType = HeaderLookup.find(headers, HeaderNames.ContentType) ?? "";
    if (raw === null || !TextualMime.isTextual(contentType)) {
        return null;
    }

    return raw.isBase64 ? Base64Text.toUtf8(raw.data) : raw.data;
}

function base64Of(raw: RawBody | null): string {
    if (raw === null) {
        return "";
    }

    return raw.isBase64 ? raw.data : Base64Text.fromUtf8(raw.data);
}

export class RequestPausedHandler implements ICdpEventHandler<"Fetch.requestPaused"> {
    readonly event = "Fetch.requestPaused";

    private readonly _dependencies: RequestPausedDependencies;
    private readonly _pending = new PendingResponses();

    constructor(dependencies: RequestPausedDependencies) {
        this._dependencies = dependencies;
    }

    async handle(tabId: number, event: Protocol.Fetch.RequestPausedEvent): Promise<void> {
        const handled = isResponseStage(event)
            ? await this.handleResponse(tabId, event)
            : await this.handleRequest(tabId, event);
        if (!handled.hasErrors || isReleasedByBrowser(handled.error)) {
            return;
        }

        this._dependencies.logger.warn(`Paused request ${event.request.url} could not be resumed.`, handled.error);
    }

    private async handleRequest(tabId: number, event: Protocol.Fetch.RequestPausedEvent): Promise<Result<unknown>> {
        const { activeRules, debuggerClient } = this._dependencies;
        const original = PausedDrafts.requestOf(event);
        const stage = RulePipeline.runRequest(
            activeRules.debuggerEntries(),
            original,
            activeRules.context()
        );
        if (stage.delayMs > 0 && !CorsHeaders.isPreflight(original)) {
            await delay(stage.delayMs);
        }

        const draft = stage.draft;
        if (draft.response !== null) {
            return this.answer(
                tabId,
                event,
                {
                    steps: stage.steps,
                    request: draft,
                    response: draft.response,
                }
            );
        }

        this.record(
            tabId,
            event.networkId,
            stage.steps,
            false
        );

        if (stage.responseCandidates.length > 0) {
            this._pending.add(
                event.requestId,
                {
                    request: draft,
                    candidates: stage.responseCandidates,
                }
            );
        }

        return debuggerClient.send(
            tabId,
            "Fetch.continueRequest",
            {
                requestId: event.requestId,
                url: draft.url === original.url ? undefined : draft.url,
                method: draft.method === original.method ? undefined : draft.method,
                headers: headersOf(draft, original),
                postData: draft.body === original.body || draft.body === null ? undefined : Base64Text.fromUtf8(draft.body),
            }
        );
    }

    private async handleResponse(tabId: number, event: Protocol.Fetch.RequestPausedEvent): Promise<Result<unknown>> {
        const { activeRules, debuggerClient } = this._dependencies;
        const pending = this._pending.take(event.requestId);
        if (pending === null) {
            return this.continueAsIs(tabId, event.requestId);
        }

        const hasError = event.responseErrorReason !== undefined;
        const needsBody = pending.candidates.some(candidate => candidate.entry.plan.type?.needsResponseBody === true);
        const raw = needsBody && !hasError ? await this.readBody(tabId, event.requestId) : null;
        const originalText = textOf(raw, event.responseHeaders ?? []);
        const stage = RulePipeline.runResponse(
            pending.candidates,
            pending.request,
            PausedDrafts.responseOf(event, originalText),
            activeRules.context()
        );
        const draft = stage.draft;
        this.record(
            tabId,
            event.networkId,
            stage.steps,
            false
        );

        if (!hasChanges(stage.steps) || hasError) {
            return this.continueAsIs(tabId, event.requestId);
        }

        const body = draft.body === originalText
            ? base64Of(raw ?? await this.readBody(tabId, event.requestId))
            : Base64Text.fromUtf8(draft.body ?? "");

        return debuggerClient.send(
            tabId,
            "Fetch.fulfillRequest",
            {
                requestId: event.requestId,
                responseCode: draft.status,
                responseHeaders: deliverableHeaders(draft.headers),
                body,
            }
        );
    }

    private answer(
        tabId: number,
        event: Protocol.Fetch.RequestPausedEvent,
        answer: RuleAnswer
    ): Promise<Result<unknown>> {
        const { activeRules } = this._dependencies;
        const answered = RulePipeline.runResponse(
            RulePipeline.answeredCandidates(activeRules.wholeEntries(), answer.request),
            answer.request,
            RulePipeline.answeredResponseOf(answer.response),
            activeRules.context()
        );
        this.record(
            tabId,
            event.networkId,
            [
                ...answer.steps,
                ...answered.steps,
            ],
            true
        );

        return this.fulfill(
            tabId,
            event.requestId,
            RulePipeline.syntheticResponseOf(answered.draft)
        );
    }

    private record(
        tabId: number,
        networkId: string | undefined,
        steps: AppliedStep[],
        isAnsweredByRule: boolean
    ): void {
        const { timelineStore, pendingDocuments, hitCounter } = this._dependencies;
        steps.forEach(step => hitCounter.count(step.plan.rule.id));
        if (networkId === undefined || steps.length === 0) {
            return;
        }

        const annotation = StepAnnotations.of(
            steps,
            RuleEngine.Debugger,
            isAnsweredByRule
        );

        if (pendingDocuments.has(tabId, networkId)) {
            pendingDocuments.update(
                tabId,
                networkId,
                record => TimelineAnnotations.applyTo(record, annotation)
            );

            return;
        }

        timelineStore.annotate(
            tabId,
            networkId,
            annotation
        );
    }

    private fulfill(
        tabId: number,
        requestId: string,
        response: SyntheticResponse
    ): Promise<Result<unknown>> {
        return this._dependencies.debuggerClient.send(
            tabId,
            "Fetch.fulfillRequest",
            {
                requestId,
                responseCode: response.status,
                responseHeaders: deliverableHeaders(response.headers),
                body: Base64Text.fromUtf8(response.body),
            }
        );
    }

    private continueAsIs(tabId: number, requestId: string): Promise<Result<unknown>> {
        return this._dependencies.debuggerClient.send(
            tabId,
            "Fetch.continueRequest",
            {
                requestId,
            }
        );
    }

    private async readBody(tabId: number, requestId: string): Promise<RawBody | null> {
        const response = await this._dependencies.debuggerClient.send(
            tabId,
            "Fetch.getResponseBody",
            {
                requestId,
            }
        );
        if (response.hasErrors) {
            this._dependencies.logger.warn("Reading a paused response body failed.", response.error);

            return null;
        }

        return {
            data: response.value.body,
            isBase64: response.value.base64Encoded,
        };
    }
}
