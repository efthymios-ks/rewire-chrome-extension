import type { RequestDraft, ResponseDraft } from "../../../Common/Rules/Drafts/Drafts";
import { RulePipeline } from "../../../Common/Rules/Engine/RulePipeline";
import { RuleEngine } from "../../../Contracts/Rules/RuleEngine";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { TimelineAnnotation } from "../../../Contracts/Timeline/TimelineAnnotation";
import type { IActiveRules } from "../Rules/ActiveRules";
import { StepAnnotations } from "../Rules/StepAnnotations";
import type { TimelineRecord } from "./TimelineRecord";

export interface IBrowserRuleSimulator {
    onRequest(record: TimelineRecord): TimelineAnnotation | null;
    onResponse(
        record: TimelineRecord,
        status: number,
        headers: HeaderEntry[]
    ): TimelineAnnotation | null;
}

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

function responseOf(status: number, headers: HeaderEntry[]): ResponseDraft {
    return {
        status,
        headers,
        body: null,
        errorReason: null,
    };
}

export class BrowserRuleSimulator implements IBrowserRuleSimulator {
    private readonly _activeRules: IActiveRules;

    constructor(activeRules: IActiveRules) {
        this._activeRules = activeRules;
    }

    onRequest(record: TimelineRecord): TimelineAnnotation | null {
        const entries = this._activeRules.browserEntries();
        if (entries.length === 0) {
            return null;
        }

        const stage = RulePipeline.runRequest(
            entries,
            requestOf(record),
            this._activeRules.simulationContext()
        );

        return stage.steps.length === 0
            ? null
            : StepAnnotations.of(
                stage.steps,
                RuleEngine.Browser,
                false
            );
    }

    onResponse(
        record: TimelineRecord,
        status: number,
        headers: HeaderEntry[]
    ): TimelineAnnotation | null {
        const entries = this._activeRules.browserEntries();
        if (entries.length === 0 || record.summary.isAnsweredByRule) {
            return null;
        }

        const context = this._activeRules.simulationContext();
        const requestStage = RulePipeline.runRequest(
            entries,
            requestOf(record),
            context
        );
        if (requestStage.responseCandidates.length === 0) {
            return null;
        }

        const responseStage = RulePipeline.runResponse(
            requestStage.responseCandidates,
            requestStage.draft,
            responseOf(status, headers),
            context
        );

        return responseStage.steps.length === 0
            ? null
            : StepAnnotations.of(
                responseStage.steps,
                RuleEngine.Browser,
                false
            );
    }
}
