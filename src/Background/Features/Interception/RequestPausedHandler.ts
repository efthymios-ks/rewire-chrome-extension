import type { Protocol } from 'devtools-protocol';
import { delayAsync } from '../../../Common/Async/delayAsync';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import { TextualMime } from '../../../Common/Http/TextualMime';
import type { Logger } from '../../../Common/Logging/Logger';
import { Result } from '../../../Common/Results/Result';
import type { RequestDraft } from '../../../Common/Rules/Drafts/RequestDraft';
import type { SyntheticResponse } from '../../../Common/Rules/Drafts/SyntheticResponse';
import type { AppliedStep } from '../../../Common/Rules/Engine/AppliedStep';
import { HeaderList } from '../../../Common/Rules/Http/HeaderList';
import { CorsHeaders } from '../../../Common/Rules/Types/Headers/CorsHeaders';
import { RulePipeline } from '../../../Common/Rules/Engine/RulePipeline';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { TimelineStore } from '../Capture/TimelineStore';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { ActiveRules } from '../Rules/ActiveRules';
import type { RuleHitCounter } from '../Rules/RuleHitCounter';
import { StepAnnotations } from '../Rules/StepAnnotations';
import { PausedDrafts } from './PausedDrafts';
import { PendingResponses } from './PendingResponses';

interface RuleAnswer {
    steps: AppliedStep[];
    request: RequestDraft;
    response: SyntheticResponse;
}

const RELEASED_BY_BROWSER_ERRORS = [
    'Fetch domain is not enabled',
    'Invalid InterceptionId',
];

const REDIRECT_STATUSES = [
    301,
    302,
    303,
    307,
    308,
];

interface RawBody {
    data: string;
    isBase64: boolean;
}

export interface RequestPausedHandlerDependencies {
    activeRules: ActiveRules;
    debuggerClient: DebuggerClient;
    timelineStore: TimelineStore;
    hitCounter: RuleHitCounter;
    logger: Logger;
}

function isResponseStage(event: Protocol.Fetch.RequestPausedEvent): boolean {
    return event.responseStatusCode != null || event.responseErrorReason != null;
}

function isRedirect(event: Protocol.Fetch.RequestPausedEvent): boolean {
    return REDIRECT_STATUSES.includes(event.responseStatusCode ?? 0)
        && HeaderLookup.find(event.responseHeaders ?? [], HEADER_NAMES.Location) != null;
}

function isReleasedByBrowser(error: string): boolean {
    return RELEASED_BY_BROWSER_ERRORS.some(message => error.includes(message));
}

function hasChanges(steps: AppliedStep[]): boolean {
    return steps.some(step => step.changes.length > 0);
}

function headersOf(draft: RequestDraft, original: RequestDraft): HeaderEntry[] | undefined {
    return JSON.stringify(draft.headers) === JSON.stringify(original.headers) ? undefined : draft.headers;
}

const RECOMPUTED_HEADERS = [
    HEADER_NAMES.ContentEncoding,
    HEADER_NAMES.ContentLength,
];

function deliverableHeaders(headers: HeaderEntry[]): HeaderEntry[] {
    return RECOMPUTED_HEADERS.reduce((current, name) => HeaderList.remove(current, name), headers);
}

function textOf(raw: RawBody | null, headers: HeaderEntry[]): string | null {
    const contentType = HeaderLookup.find(headers, HEADER_NAMES.ContentType) ?? '';
    if (raw == null || !TextualMime.isTextual(contentType)) {
        return null;
    }

    return raw.isBase64 ? Base64Text.toUtf8(raw.data) : raw.data;
}

function base64Of(raw: RawBody | null): string {
    if (raw == null) {
        return '';
    }

    return raw.isBase64 ? raw.data : Base64Text.fromUtf8(raw.data);
}

export interface AnswerAsyncOptions {
    tabId: number;
    event: Protocol.Fetch.RequestPausedEvent;
    answer: RuleAnswer;
}

export interface RecordOptions {
    tabId: number;
    networkId: string | undefined;
    steps: AppliedStep[];
    isAnsweredByRule: boolean;
}

export interface FulfillAsyncOptions {
    tabId: number;
    requestId: string;
    response: SyntheticResponse;
}

export interface SkipResponseRulesAsyncOptions {
    tabId: number;
    event: Protocol.Fetch.RequestPausedEvent;
    error: string;
}

export interface OriginalBodyAsyncOptions {
    tabId: number;
    event: Protocol.Fetch.RequestPausedEvent;
    raw: RawBody | null;
}

export class RequestPausedHandler implements CdpEventHandler<'Fetch.requestPaused'> {
    readonly event = 'Fetch.requestPaused';

    private readonly _dependencies: RequestPausedHandlerDependencies;
    private readonly _pending = new PendingResponses();

    constructor(dependencies: RequestPausedHandlerDependencies) {
        this._dependencies = dependencies;
    }

    async handleAsync(tabId: number, event: Protocol.Fetch.RequestPausedEvent): Promise<void> {
        const handled = isResponseStage(event)
            ? await this.handleResponseAsync(tabId, event)
            : await this.handleRequestAsync(tabId, event);
        if (!handled.hasErrors || isReleasedByBrowser(handled.error)) {
            return;
        }

        this._dependencies.logger.warn(
            /* message: */ `Paused request ${event.request.url} could not be resumed.`,
            /* context: */ handled.error,
        );
    }

    private async handleRequestAsync(
        tabId: number,
        event: Protocol.Fetch.RequestPausedEvent,
    ): Promise<Result<unknown>> {
        const { activeRules, debuggerClient } = this._dependencies;
        const original = PausedDrafts.requestOf(event);
        const stage = RulePipeline.runRequest({
            entries: activeRules.debuggerEntries(),
            draft: original,
            context: activeRules.context(),
        });
        if (stage.delayMs > 0 && !CorsHeaders.isPreflight(original)) {
            await delayAsync(stage.delayMs);
        }

        const draft = stage.draft;
        if (draft.response != null) {
            return this.answerAsync({
                tabId,
                event,
                answer: {
                    steps: stage.steps,
                    request: draft,
                    response: draft.response,
                },
            });
        }

        this.record({ tabId, networkId: event.networkId, steps: stage.steps, isAnsweredByRule: false });

        if (stage.responseCandidates.length > 0) {
            this._pending.add(
                /* interceptionId: */ event.requestId,
                /* pending: */ {
                    request: draft,
                    candidates: stage.responseCandidates,
                },
            );
        }

        return debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Fetch.continueRequest',
            /* params: */ {
                requestId: event.requestId,
                url: draft.url === original.url ? undefined : draft.url,
                method: draft.method === original.method ? undefined : draft.method,
                headers: headersOf(draft, original),
                postData: draft.body === original.body || draft.body == null
                    ? undefined
                    : Base64Text.fromUtf8(draft.body),
            },
        );
    }

    private async handleResponseAsync(
        tabId: number,
        event: Protocol.Fetch.RequestPausedEvent,
    ): Promise<Result<unknown>> {
        const { activeRules, debuggerClient } = this._dependencies;
        const pending = this._pending.take(event.requestId);
        if (pending == null) {
            return this.continueAsIsAsync(tabId, event.requestId);
        }

        const hasError = event.responseErrorReason != null;
        const needsBody = !hasError && pending.candidates.some(candidate => {
            const { rule, type } = candidate.entry.plan;

            return type?.readsResponseBody(rule.action) === true;
        });
        const read = needsBody ? await this.readBodyAsync(tabId, event) : Result.ok(null);
        if (read.hasErrors) {
            return this.skipResponseRulesAsync({ tabId, event, error: read.error });
        }

        const originalText = textOf(read.value, event.responseHeaders ?? []);
        const stage = RulePipeline.runResponse({
            candidates: pending.candidates,
            request: pending.request,
            response: PausedDrafts.responseOf(event, originalText),
            context: activeRules.context(),
        });
        const draft = stage.draft;
        const recorded: RecordOptions = {
            tabId,
            networkId: event.networkId,
            steps: stage.steps,
            isAnsweredByRule: false,
        };
        if (!hasChanges(stage.steps) || hasError) {
            this.record(recorded);

            return this.continueAsIsAsync(tabId, event.requestId);
        }

        const body = draft.body === originalText
            ? await this.originalBodyAsync({ tabId, event, raw: read.value })
            : Result.ok(Base64Text.fromUtf8(draft.body ?? ''));
        if (body.hasErrors) {
            return this.skipResponseRulesAsync({ tabId, event, error: body.error });
        }

        this.record(recorded);

        return debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Fetch.fulfillRequest',
            /* params: */ {
                requestId: event.requestId,
                responseCode: draft.status,
                responseHeaders: deliverableHeaders(draft.headers),
                body: body.value,
            },
        );
    }

    private skipResponseRulesAsync({
        tabId,
        event,
        error,
    }: SkipResponseRulesAsyncOptions): Promise<Result<unknown>> {
        this._dependencies.logger.warn(
            /* message: */ `Response rules skipped for ${event.request.url}, its body is unreadable.`,
            /* context: */ error,
        );

        return this.continueAsIsAsync(tabId, event.requestId);
    }

    private answerAsync({ tabId, event, answer }: AnswerAsyncOptions): Promise<Result<unknown>> {
        const { activeRules } = this._dependencies;
        const answered = RulePipeline.runResponse({
            candidates: RulePipeline.answeredCandidates(
                /* entries: */ activeRules.wholeEntries(),
                /* request: */ answer.request,
            ),
            request: answer.request,
            response: RulePipeline.answeredResponseOf(answer.response),
            context: activeRules.context(),
        });
        this.record({
            tabId,
            networkId: event.networkId,
            steps: [
                ...answer.steps,
                ...answered.steps,
            ],
            isAnsweredByRule: true,
        });

        return this.fulfillAsync({
            tabId,
            requestId: event.requestId,
            response: RulePipeline.syntheticResponseOf(answered.draft),
        });
    }

    private record({ tabId, networkId, steps, isAnsweredByRule }: RecordOptions): void {
        const { timelineStore, hitCounter } = this._dependencies;
        steps.forEach(step => hitCounter.count(step.plan.rule.id));
        if (networkId == null || steps.length === 0) {
            return;
        }

        const annotation = StepAnnotations.of({ steps, engine: RULE_ENGINE.Debugger, isAnsweredByRule });
        timelineStore.annotate({ tabId, entryId: networkId, annotation });
    }

    private fulfillAsync({ tabId, requestId, response }: FulfillAsyncOptions): Promise<Result<unknown>> {
        return this._dependencies.debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Fetch.fulfillRequest',
            /* params: */ {
                requestId,
                responseCode: response.status,
                responseHeaders: deliverableHeaders(response.headers),
                body: Base64Text.fromUtf8(response.body),
            },
        );
    }

    private continueAsIsAsync(tabId: number, requestId: string): Promise<Result<unknown>> {
        return this._dependencies.debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Fetch.continueRequest',
            /* params: */ {
                requestId,
            },
        );
    }

    private async originalBodyAsync({
        tabId,
        event,
        raw,
    }: OriginalBodyAsyncOptions): Promise<Result<string>> {
        const read = raw == null ? await this.readBodyAsync(tabId, event) : Result.ok(raw);

        return read.hasErrors ? read : Result.ok(base64Of(read.value));
    }

    private async readBodyAsync(
        tabId: number,
        event: Protocol.Fetch.RequestPausedEvent,
    ): Promise<Result<RawBody | null>> {
        const response = await this._dependencies.debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Fetch.getResponseBody',
            /* params: */ {
                requestId: event.requestId,
            },
        );
        if (!response.hasErrors) {
            return Result.ok({
                data: response.value.body,
                isBase64: response.value.base64Encoded,
            });
        }

        // The browser follows a redirect's Location and never shows its body.
        return isRedirect(event) ? Result.ok(null) : Result.fail(response.error);
    }
}
