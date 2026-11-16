import { RULE_ENGINE, type RuleEngine } from '../../../Contracts/Rules/RuleEngine';
import type { PipelineEntry } from './PipelineEntry';
import type { RulePlan } from './RulePlan';

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

const DEBUGGER_ENTRIES: EntryRule[] = [
    {
        engine: RULE_ENGINE.Debugger,
        request: runsAtRequest,
        response: runsAtResponse,
    },
    {
        engine: RULE_ENGINE.Both,
        request: runsAtRequest,
        response: () => false,
    },
];

const BROWSER_ENTRIES: EntryRule[] = [
    {
        engine: RULE_ENGINE.Browser,
        request: runsAtRequest,
        response: runsAtResponse,
    },
    {
        engine: RULE_ENGINE.Both,
        request: () => false,
        response: runsAtResponse,
    },
];

function entriesBy(plans: RulePlan[], rules: EntryRule[]): PipelineEntry[] {
    return plans.flatMap(plan => {
        const rule = rules.find(candidate => candidate.engine === plan.engine);
        if (rule == null || plan.type == null) {
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
        return entriesBy(plans, DEBUGGER_ENTRIES);
    },

    forBrowser(plans: RulePlan[]): PipelineEntry[] {
        return entriesBy(plans, BROWSER_ENTRIES);
    },

    forWholeRules(plans: RulePlan[]): PipelineEntry[] {
        return plans.flatMap(plan => PipelineEntries.forWholeRule(plan));
    },

    forWholeRule(plan: RulePlan): PipelineEntry[] {
        if (plan.type == null || plan.engine === RULE_ENGINE.Invalid) {
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
