import { RollOnceRuleContext } from '../Context/RollOnceRuleContext';
import type { RuleContext } from '../Context/RuleContext';
import { CriteriaEvaluator } from '../Criteria/CriteriaEvaluator';
import type { RequestDraft } from '../Drafts/RequestDraft';
import type { ResponseDraft } from '../Drafts/ResponseDraft';
import { PipelineEntries } from './PipelineEntries';
import type { PipelineEntry } from './PipelineEntry';
import { RulePipeline, type RequestStageResult, type ResponseStageResult } from './RulePipeline';
import type { RulePlan } from './RulePlan';
import type { TesterInput } from './TesterInput';
import type { TesterOutcome } from './TesterOutcome';
import { TESTER_OUTCOME_KIND } from './TesterOutcomeKind';
import type { TesterReport } from './TesterReport';

const DEFAULT_TEST_STATUS = 200;

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
        status: input.response?.status ?? DEFAULT_TEST_STATUS,
        headers: input.response?.headers ?? [],
        body: input.response?.body ?? '',
        errorReason: null,
    };
}

function outcomeOf(request: RequestDraft, response: ResponseDraft | null): TesterOutcome {
    return {
        kind: request.response == null ? TESTER_OUTCOME_KIND.Continued : TESTER_OUTCOME_KIND.Answered,
        url: request.url,
        response: response == null ? null : RulePipeline.syntheticResponseOf(response),
    };
}

interface ResponseStageOfOptions {
    requestStage: RequestStageResult;
    answerEntries: PipelineEntry[];
    input: TesterInput;
    context: RuleContext;
}

function responseStageOf({
    requestStage,
    answerEntries,
    input,
    context,
}: ResponseStageOfOptions): ResponseStageResult {
    const request = requestStage.draft;
    if (request.response != null) {
        return RulePipeline.runResponse({
            candidates: RulePipeline.answeredCandidates(answerEntries, request),
            request,
            response: RulePipeline.answeredResponseOf(request.response),
            context,
        });
    }

    return RulePipeline.runResponse({
        candidates: requestStage.responseCandidates,
        request,
        response: responseDraftOf(input),
        context,
    });
}

interface RunOptions {
    entries: PipelineEntry[];
    answerEntries: PipelineEntry[];
    input: TesterInput;
    context: RuleContext;
}

function run({
    entries,
    answerEntries,
    input,
    context,
}: RunOptions): Omit<TesterReport, 'requestEvaluation' | 'responseEvaluation'> {
    const requestStage = RulePipeline.runRequest({
        entries,
        draft: requestDraftOf(input),
        context,
    });
    const responseStage = responseStageOf({ requestStage, answerEntries, input, context });

    return {
        requestStage,
        responseStage,
        outcome: outcomeOf(requestStage.draft, responseStage.draft),
    };
}

export interface TestRuleOptions {
    plan: RulePlan;
    input: TesterInput;
    context: RuleContext;
}

export interface TestAllOptions {
    plans: RulePlan[];
    input: TesterInput;
    context: RuleContext;
}

export const RuleTester = {
    testRule({ plan, input, context }: TestRuleOptions): TesterReport {
        const runContext = new RollOnceRuleContext(context);
        const request = requestDraftOf(input);
        const requestEvaluation = CriteriaEvaluator.evaluate({
            criteria: plan.rule.criteria,
            facts: {
                request,
                response: null,
            },
            context: runContext,
        });
        const responseEvaluation = CriteriaEvaluator.evaluate({
            criteria: plan.rule.criteria,
            facts: {
                request,
                response: responseDraftOf(input),
            },
            context: runContext,
        });

        return {
            requestEvaluation,
            responseEvaluation,
            ...run({
                entries: PipelineEntries.forWholeRule(plan),
                answerEntries: PipelineEntries.forWholeRule(plan),
                input,
                context: runContext,
            }),
        };
    },

    testAll({ plans, input, context }: TestAllOptions): TesterReport {
        const runContext = new RollOnceRuleContext(context);
        const entries = [
            ...PipelineEntries.forBrowser(plans),
            ...PipelineEntries.forDebugger(plans),
        ];

        return {
            requestEvaluation: null,
            responseEvaluation: null,
            ...run({
                entries,
                answerEntries: PipelineEntries.forWholeRules(plans),
                input,
                context: runContext,
            }),
        };
    },
};
