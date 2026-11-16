import type { RuleContext } from '../Context/RuleContext';
import { CriteriaEvaluator } from '../Criteria/CriteriaEvaluator';
import { CRITERIA_OUTCOME } from '../Criteria/CriteriaOutcome';
import { ResourceScope } from '../Criteria/ResourceScope';
import { DraftChanges } from '../Drafts/DraftChanges';
import type { RequestDraft } from '../Drafts/RequestDraft';
import type { ResponseDraft } from '../Drafts/ResponseDraft';
import type { SyntheticResponse } from '../Drafts/SyntheticResponse';
import type { AppliedStep } from './AppliedStep';
import type { PipelineEntry } from './PipelineEntry';
import type { ResponseCandidate } from './ResponseCandidate';

export interface RequestStageResult {
    draft: RequestDraft;
    steps: AppliedStep[];
    delayMs: number;
    responseCandidates: ResponseCandidate[];
}

export interface ResponseStageResult {
    draft: ResponseDraft;
    steps: AppliedStep[];
}

export interface RunRequestOptions {
    entries: PipelineEntry[];
    draft: RequestDraft;
    context: RuleContext;
}

export interface RunResponseOptions {
    candidates: ResponseCandidate[];
    request: RequestDraft;
    response: ResponseDraft;
    context: RuleContext;
}

export const RulePipeline = {
    runRequest({ entries, draft, context }: RunRequestOptions): RequestStageResult {
        let current = draft;
        let delayMs = 0;
        const steps: AppliedStep[] = [];
        const responseCandidates: ResponseCandidate[] = [];

        for (const entry of entries) {
            const { plan } = entry;
            if (!ResourceScope.allows(plan.rule.criteria, current.resourceType)) {
                continue;
            }

            const evaluation = CriteriaEvaluator.evaluate({
                criteria: plan.rule.criteria,
                facts: {
                    request: current,
                    response: null,
                },
                context,
            });
            if (evaluation.outcome === CRITERIA_OUTCOME.Deferred && entry.runsResponse) {
                responseCandidates.push({
                    entry,
                    isPreMatched: false,
                });
            }

            if (evaluation.outcome !== CRITERIA_OUTCOME.Matched) {
                continue;
            }

            delayMs = Math.max(delayMs, plan.delayMs);
            if (entry.runsResponse) {
                responseCandidates.push({
                    entry,
                    isPreMatched: true,
                });
            }

            if (!entry.runsRequest || plan.type == null) {
                continue;
            }

            const next = plan.type.applyRequest({
                draft: current,
                action: plan.rule.action,
                context,
                criteria: plan.rule.criteria,
            });
            steps.push({
                plan,
                changes: DraftChanges.ofRequest(current, next),
            });
            current = next;
        }

        return {
            draft: current,
            steps,
            delayMs,
            responseCandidates,
        };
    },

    runResponse({ candidates, request, response, context }: RunResponseOptions): ResponseStageResult {
        let current = response;
        const steps: AppliedStep[] = [];

        for (const candidate of candidates) {
            const { plan } = candidate.entry;
            if (plan.type == null) {
                continue;
            }

            if (!candidate.isPreMatched) {
                const evaluation = CriteriaEvaluator.evaluate({
                    criteria: plan.rule.criteria,
                    facts: {
                        request,
                        response: current,
                    },
                    context,
                });
                if (evaluation.outcome !== CRITERIA_OUTCOME.Matched) {
                    continue;
                }
            }

            const next = plan.type.applyResponse({
                draft: current,
                action: plan.rule.action,
                context,
                request,
            });
            steps.push({
                plan,
                changes: DraftChanges.ofResponse(current, next),
            });
            current = next;
        }

        return {
            draft: current,
            steps,
        };
    },

    answeredCandidates(entries: PipelineEntry[], request: RequestDraft): ResponseCandidate[] {
        return entries
            .filter(entry => entry.runsResponse)
            .filter(entry => ResourceScope.allows(entry.plan.rule.criteria, request.resourceType))
            .map(entry => ({
                entry,
                isPreMatched: false,
            }));
    },

    answeredResponseOf(response: SyntheticResponse): ResponseDraft {
        return {
            status: response.status,
            headers: response.headers,
            body: response.body,
            errorReason: null,
        };
    },

    syntheticResponseOf(response: ResponseDraft): SyntheticResponse {
        return {
            status: response.status,
            headers: response.headers,
            body: response.body ?? '',
        };
    },
};
