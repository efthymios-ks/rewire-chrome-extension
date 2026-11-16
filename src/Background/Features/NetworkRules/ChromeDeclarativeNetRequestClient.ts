import type { RegexSupportClient } from '../../../Common/NetworkRules/RegexSupportClient';
import { Result } from '../../../Common/Results/Result';
import type { DeclarativeNetRequestClient } from './DeclarativeNetRequestClient';

export class ChromeDeclarativeNetRequestClient implements DeclarativeNetRequestClient {
    private readonly _regexSupportClient: RegexSupportClient;

    constructor(regexSupportClient: RegexSupportClient) {
        this._regexSupportClient = regexSupportClient;
    }

    replaceAllAsync(rules: chrome.declarativeNetRequest.Rule[]): Promise<Result<void>> {
        return Result.attemptAsync(async () => {
            const existing = await chrome.declarativeNetRequest.getDynamicRules();
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existing.map(rule => rule.id),
                addRules: rules,
            });
        });
    }

    async removeAllAsync(): Promise<Result<void>> {
        return this.replaceAllAsync([]);
    }

    addAsync(rule: chrome.declarativeNetRequest.Rule): Promise<Result<void>> {
        return Result.attemptAsync(() => chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [rule],
        }));
    }

    checkRegexAsync(regex: string): Promise<Result<void>> {
        return this._regexSupportClient.checkAsync(regex);
    }
}
