import type { Result } from '../../../Common/Results/Result';

export interface DeclarativeNetRequestClient {
    replaceAllAsync(rules: chrome.declarativeNetRequest.Rule[]): Promise<Result<void>>;
    removeAllAsync(): Promise<Result<void>>;
    addAsync(rule: chrome.declarativeNetRequest.Rule): Promise<Result<void>>;
    checkRegexAsync(regex: string): Promise<Result<void>>;
}
