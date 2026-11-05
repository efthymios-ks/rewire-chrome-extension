import type { Result } from "../../../Common/Results/Result";

export interface IDeclarativeNetRequestClient {
    replaceAll(rules: chrome.declarativeNetRequest.Rule[]): Promise<Result<void>>;
    removeAll(): Promise<Result<void>>;
    add(rule: chrome.declarativeNetRequest.Rule): Promise<Result<void>>;
    checkRegex(regex: string): Promise<Result<void>>;
}
