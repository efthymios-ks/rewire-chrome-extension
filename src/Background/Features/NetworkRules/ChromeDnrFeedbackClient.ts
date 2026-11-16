import { Result } from '../../../Common/Results/Result';
import type { DnrFeedbackClient, MatchedBrowserRule } from './DnrFeedbackClient';

export class ChromeDnrFeedbackClient implements DnrFeedbackClient {
    subscribeDebug(listener: (dnrRuleId: number) => void): boolean {
        const debugEvent = chrome.declarativeNetRequest.onRuleMatchedDebug;
        if (debugEvent == null) {
            return false;
        }

        debugEvent.addListener(info => listener(info.rule.ruleId));

        return true;
    }

    matchedSinceAsync(minTimeStamp: number): Promise<Result<MatchedBrowserRule[]>> {
        return Result.attemptAsync(async () => {
            const matched = await chrome.declarativeNetRequest.getMatchedRules({
                minTimeStamp,
            });

            return matched.rulesMatchedInfo.map(info => ({
                dnrRuleId: info.rule.ruleId,
                timeStamp: info.timeStamp,
            }));
        });
    }
}
