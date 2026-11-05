import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";

export interface MatchedBrowserRule {
    dnrRuleId: number;
    timeStamp: number;
}

export interface IDnrFeedbackClient {
    subscribeDebug(listener: (dnrRuleId: number) => void): boolean;
    matchedSince(minTimeStamp: number): Promise<Result<MatchedBrowserRule[]>>;
}

export class DnrFeedbackClient implements IDnrFeedbackClient {
    subscribeDebug(listener: (dnrRuleId: number) => void): boolean {
        const debugEvent = chrome.declarativeNetRequest.onRuleMatchedDebug;
        if (debugEvent === undefined) {
            return false;
        }

        debugEvent.addListener(info => listener(info.rule.ruleId));

        return true;
    }

    async matchedSince(minTimeStamp: number): Promise<Result<MatchedBrowserRule[]>> {
        try {
            const matched = await chrome.declarativeNetRequest.getMatchedRules({
                minTimeStamp,
            });

            return Result.ok(matched.rulesMatchedInfo.map(info => ({
                dnrRuleId: info.rule.ruleId,
                timeStamp: info.timeStamp,
            })));
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }
}
