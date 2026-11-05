import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { RuleContext } from "../Context/RuleContext";
import { type CriteriaEvaluation, CriteriaEvaluator } from "../Criteria/CriteriaEvaluator";
import type { RequestDraft, ResponseDraft, SyntheticResponse } from "../Drafts/Drafts";
import { type PipelineEntry, PipelineEntries, RulePipeline, type RequestStageResult, type ResponseStageResult } from "./RulePipeline";
import type { RulePlan } from "./RulePlan";

export interface TesterResponse {
    status: number;
    headers: HeaderEntry[];
    body: string;
}

export interface TesterInput {
    url: string;
    method: string;
    headers: HeaderEntry[];
    body: string | null;
    resourceType: string;
    response: TesterResponse | null;
}

export enum TesterOutcomeKind {
    Continued = 1,
    Answered = 2,
}

export interface TesterOutcome {
    kind: TesterOutcomeKind;
    url: string;
    response: SyntheticResponse | null;
}

export interface TesterReport {
    requestEvaluation: CriteriaEvaluation | null;
    responseEvaluation: CriteriaEvaluation | null;
    requestStage: RequestStageResult;
    responseStage: ResponseStageResult | null;
    outcome: TesterOutcome;
}

const DefaultTestStatus = 200;

function requestDraftOf(input: TesterInput): RequestDraft {
    return {
        url: input.url,
        method: input.method.toUpperCase(),
        headers: input.headers,
        body: input.body,
        resourceType: input.resourceType,
        response: null,
    };
}

function responseDraftOf(input: TesterInput): ResponseDraft {
    return {
        status: input.response?.status ?? DefaultTestStatus,
        headers: input.response?.headers ?? [],
        body: input.response?.body ?? "",
        errorReason: null,
    };
}

function outcomeOf(request: RequestDraft, response: ResponseDraft | null): TesterOutcome {
    return {
        kind: request.response === null ? TesterOutcomeKind.Continued : TesterOutcomeKind.Answered,
        url: request.url,
        response: response === null ? null : RulePipeline.syntheticResponseOf(response),
    };
}

function responseStageOf(
    requestStage: RequestStageResult,
    answerEntries: PipelineEntry[],
    input: TesterInput,
    context: RuleContext
): ResponseStageResult {
    const request = requestStage.draft;
    if (request.response !== null) {
        return RulePipeline.runResponse(
            RulePipeline.answeredCandidates(answerEntries, request),
            request,
            RulePipeline.answeredResponseOf(request.response),
            context
        );
    }

    return RulePipeline.runResponse(
        requestStage.responseCandidates,
        request,
        responseDraftOf(input),
        context
    );
}

function run(
    entries: PipelineEntry[],
    answerEntries: PipelineEntry[],
    input: TesterInput,
    context: RuleContext
): Omit<TesterReport, "requestEvaluation" | "responseEvaluation"> {
    const requestStage = RulePipeline.runRequest(
        entries,
        requestDraftOf(input),
        context
    );
    const responseStage = responseStageOf(
        requestStage,
        answerEntries,
        input,
        context
    );

    return {
        requestStage,
        responseStage,
        outcome: outcomeOf(requestStage.draft, responseStage.draft),
    };
}

export const RuleTester = {
    testRule(
        plan: RulePlan,
        input: TesterInput,
        context: RuleContext
    ): TesterReport {
        const request = requestDraftOf(input);
        const requestEvaluation = CriteriaEvaluator.evaluate(
            plan.rule.criteria,
            {
                request,
                response: null,
            },
            context
        );
        const responseEvaluation = CriteriaEvaluator.evaluate(
            plan.rule.criteria,
            {
                request,
                response: responseDraftOf(input),
            },
            context
        );

        return {
            requestEvaluation,
            responseEvaluation,
            ...run(
                PipelineEntries.forWholeRule(plan),
                PipelineEntries.forWholeRule(plan),
                input,
                context
            ),
        };
    },

    testAll(
        plans: RulePlan[],
        input: TesterInput,
        context: RuleContext
    ): TesterReport {
        const entries = [
            ...PipelineEntries.forBrowser(plans),
            ...PipelineEntries.forDebugger(plans),
        ];

        return {
            requestEvaluation: null,
            responseEvaluation: null,
            ...run(
                entries,
                PipelineEntries.forWholeRules(plans),
                input,
                context
            ),
        };
    },
};
