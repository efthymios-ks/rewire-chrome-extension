import { Result } from '../../../Common/Results/Result';

export interface MatchedBrowserRule {
    dnrRuleId: number;
    timeStamp: number;
}

export interface DnrFeedbackClient {
    subscribeDebug(listener: (dnrRuleId: number) => void): boolean;
    matchedSinceAsync(minTimeStamp: number): Promise<Result<MatchedBrowserRule[]>>;
}
