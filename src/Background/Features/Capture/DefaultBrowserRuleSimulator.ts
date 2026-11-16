import type { RequestDraft } from '../../../Common/Rules/Drafts/RequestDraft';
import { responseDraftOf } from '../../../Common/Rules/Drafts/responseDraftOf';
import { RulePipeline } from '../../../Common/Rules/Engine/RulePipeline';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import type { ActiveRules } from '../Rules/ActiveRules';
import { StepAnnotations } from '../Rules/StepAnnotations';
import type { BrowserRuleSimulator, SimulateResponseOptions } from './BrowserRuleSimulator';
import type { TimelineRecord } from './TimelineRecord';

function requestOf(record: TimelineRecord): RequestDraft {
    return {
        url: record.summary.url,
        method: record.summary.method,
        headers: record.requestHeaders,
        body: record.requestBody,
        resourceType: record.summary.resourceType,
        response: null,
    };
}

export class DefaultBrowserRuleSimulator implements BrowserRuleSimulator {
    private readonly _activeRules: ActiveRules;

    constructor(activeRules: ActiveRules) {
        this._activeRules = activeRules;
    }

    simulateRequest(record: TimelineRecord): TimelineAnnotation | null {
        const entries = this._activeRules.browserEntries();
        if (entries.length === 0) {
            return null;
        }

        const stage = RulePipeline.runRequest({
            entries,
            draft: requestOf(record),
            context: this._activeRules.simulationContext(),
        });

        return stage.steps.length === 0
            ? null
            : StepAnnotations.of({
                steps: stage.steps,
                engine: RULE_ENGINE.Browser,
                isAnsweredByRule: false,
            });
    }

    simulateResponse({ record, status, headers }: SimulateResponseOptions): TimelineAnnotation | null {
        const entries = this._activeRules.browserEntries();
        if (entries.length === 0 || record.summary.isAnsweredByRule) {
            return null;
        }

        const context = this._activeRules.simulationContext();
        const requestStage = RulePipeline.runRequest({
            entries,
            draft: requestOf(record),
            context,
        });
        if (requestStage.responseCandidates.length === 0) {
            return null;
        }

        const responseStage = RulePipeline.runResponse({
            candidates: requestStage.responseCandidates,
            request: requestStage.draft,
            response: responseDraftOf(status, headers),
            context,
        });

        return responseStage.steps.length === 0
            ? null
            : StepAnnotations.of({
                steps: responseStage.steps,
                engine: RULE_ENGINE.Browser,
                isAnsweredByRule: false,
            });
    }
}
