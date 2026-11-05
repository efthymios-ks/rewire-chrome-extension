import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";

const UnsupportedRegexMessages: Record<string, string> = {
    syntaxError: "Chrome's RE2 engine rejects the regex syntax.",
    memoryLimitExceeded: "The regex is too large for Chrome's RE2 engine.",
};

const DefaultUnsupportedMessage = "Chrome rejects the regex.";

export interface IRegexSupportClient {
    check(regex: string): Promise<Result<void>>;
}

export class RegexSupportClient implements IRegexSupportClient {
    async check(regex: string): Promise<Result<void>> {
        try {
            const outcome = await chrome.declarativeNetRequest.isRegexSupported({
                regex,
            });
            if (outcome.isSupported) {
                return Result.done();
            }

            return Result.fail(UnsupportedRegexMessages[outcome.reason ?? ""] ?? DefaultUnsupportedMessage);
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }
}
