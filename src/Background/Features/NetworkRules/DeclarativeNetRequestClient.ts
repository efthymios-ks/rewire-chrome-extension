import { ErrorText } from "../../../Common/Errors/ErrorText";
import type { IRegexSupportClient } from "../../../Common/NetworkRules/RegexSupportClient";
import { Result } from "../../../Common/Results/Result";
import type { IDeclarativeNetRequestClient } from "./IDeclarativeNetRequestClient";

export class DeclarativeNetRequestClient implements IDeclarativeNetRequestClient {
    private readonly _regexSupportClient: IRegexSupportClient;

    constructor(regexSupportClient: IRegexSupportClient) {
        this._regexSupportClient = regexSupportClient;
    }

    async replaceAll(rules: chrome.declarativeNetRequest.Rule[]): Promise<Result<void>> {
        try {
            const existing = await chrome.declarativeNetRequest.getDynamicRules();
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existing.map(rule => rule.id),
                addRules: rules,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }

    async removeAll(): Promise<Result<void>> {
        return this.replaceAll([]);
    }

    async add(rule: chrome.declarativeNetRequest.Rule): Promise<Result<void>> {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [rule],
            });

            return Result.done();
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }

    checkRegex(regex: string): Promise<Result<void>> {
        return this._regexSupportClient.check(regex);
    }
}
