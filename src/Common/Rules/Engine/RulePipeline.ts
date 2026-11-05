import { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import type { ValueChange } from "../../../Contracts/Rules/ValueChange";
import type { RuleContext } from "../Context/RuleContext";
import { CriteriaEvaluator, CriteriaOutcome } from "../Criteria/CriteriaEvaluator";
import { ResourceScope } from "../Criteria/ResourceScope";
import { DraftChanges } from "../Drafts/DraftChanges";
import type { RequestDraft, ResponseDraft, SyntheticResponse } from "../Drafts/Drafts";
import type { RulePlan } from "./RulePlan";

export interface PipelineEntry {
    plan: RulePlan;
    runsRequest: boolean;
    runsResponse: boolean;
}

export interface AppliedStep {
    plan: RulePlan;
    changes: ValueChange[];
}

export interface ResponseCandidate {
    entry: PipelineEntry;
    isPreMatched: boolean;
}

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

interface EntryRule {
    engine: RuleEngine;
    request(plan: RulePlan): boolean;
    response(plan: RulePlan): boolean;
}

function runsAtRequest(plan: RulePlan): boolean {
    return plan.type?.runsAtRequest(plan.rule.action) === true;
}

function runsAtResponse(plan: RulePlan): boolean {
    return plan.type?.runsAtResponse(plan.rule.action, plan.rule.criteria) === true;
}

const DebuggerEntries: EntryRule[] = [
    {
        engine: RuleEngine.Debugger,
        request: runsAtRequest,
        response: runsAtResponse,
    },
    {
        engine: RuleEngine.Both,
        request: runsAtRequest,
        response: () => false,
    },
];

const BrowserEntries: EntryRule[] = [
    {
        engine: RuleEngine.Browser,
        request: runsAtRequest,
        response: runsAtResponse,
    },
    {
        engine: RuleEngine.Both,
        request: () => false,
        response: runsAtResponse,
    },
];

function entriesBy(plans: RulePlan[], rules: EntryRule[]): PipelineEntry[] {
    return plans.flatMap(plan => {
        const rule = rules.find(candidate => candidate.engine === plan.engine);
        if (rule === undefined || plan.type === null) {
            return [];
        }

        return [
            {
                plan,
                runsRequest: rule.request(plan),
                runsResponse: rule.response(plan),
            },
        ];
    });
}

export const PipelineEntries = {
    forDebugger(plans: RulePlan[]): PipelineEntry[] {
        return entriesBy(plans, DebuggerEntries);
    },

    forBrowser(plans: RulePlan[]): PipelineEntry[] {
        return entriesBy(plans, BrowserEntries);
    },

    forWholeRules(plans: RulePlan[]): PipelineEntry[] {
        return plans.flatMap(plan => PipelineEntries.forWholeRule(plan));
    },

    forWholeRule(plan: RulePlan): PipelineEntry[] {
        if (plan.type === null || plan.engine === RuleEngine.Invalid) {
            return [];
        }

        return [
            {
                plan,
                runsRequest: runsAtRequest(plan),
                runsResponse: runsAtResponse(plan),
            },
        ];
    },
};

export const RulePipeline = {
    runRequest(
        entries: PipelineEntry[],
        draft: RequestDraft,
        context: RuleContext
    ): RequestStageResult {
        let current = draft;
        let delayMs = 0;
        const steps: AppliedStep[] = [];
        const responseCandidates: ResponseCandidate[] = [];

        for (const entry of entries) {
            const { plan } = entry;
            if (!ResourceScope.allows(plan.rule.criteria, current.resourceType)) {
                continue;
            }

            const evaluation = CriteriaEvaluator.evaluate(
                plan.rule.criteria,
                {
                    request: current,
                    response: null,
                },
                context
            );
            if (evaluation.outcome === CriteriaOutcome.Deferred && entry.runsResponse) {
                responseCandidates.push({
                    entry,
                    isPreMatched: false,
                });
            }

            if (evaluation.outcome !== CriteriaOutcome.Matched) {
                continue;
            }

            delayMs = Math.max(delayMs, plan.delayMs);
            if (entry.runsResponse) {
                responseCandidates.push({
                    entry,
                    isPreMatched: true,
                });
            }

            if (!entry.runsRequest || plan.type === null) {
                continue;
            }

            const next = plan.type.applyRequest(
                current,
                plan.rule.action,
                context,
                plan.rule.criteria
            );
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

    runResponse(
        candidates: ResponseCandidate[],
        request: RequestDraft,
        response: ResponseDraft,
        context: RuleContext
    ): ResponseStageResult {
        let current = response;
        const steps: AppliedStep[] = [];

        for (const candidate of candidates) {
            const { plan } = candidate.entry;
            if (plan.type === null) {
                continue;
            }

            if (!candidate.isPreMatched) {
                const evaluation = CriteriaEvaluator.evaluate(
                    plan.rule.criteria,
                    {
                        request,
                        response: current,
                    },
                    context
                );
                if (evaluation.outcome !== CriteriaOutcome.Matched) {
                    continue;
                }
            }

            const next = plan.type.applyResponse(
                current,
                plan.rule.action,
                context,
                request
            );
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
            .filter(entry => entry.runsResponse && ResourceScope.allows(entry.plan.rule.criteria, request.resourceType))
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
            body: response.body ?? "",
        };
    },

    isTerminal(draft: RequestDraft): boolean {
        return draft.response !== null;
    },
};
