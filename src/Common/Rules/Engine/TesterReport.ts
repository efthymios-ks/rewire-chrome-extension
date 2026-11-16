import type { CriteriaEvaluation } from '../Criteria/CriteriaEvaluation';
import type { RequestStageResult, ResponseStageResult } from './RulePipeline';
import type { TesterOutcome } from './TesterOutcome';

export interface TesterReport {
    requestEvaluation: CriteriaEvaluation | null;
    responseEvaluation: CriteriaEvaluation | null;
    requestStage: RequestStageResult;
    responseStage: ResponseStageResult | null;
    outcome: TesterOutcome;
}
