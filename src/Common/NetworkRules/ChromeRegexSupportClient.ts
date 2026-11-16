import { ErrorText } from '../Errors/ErrorText';
import { Result } from '../Results/Result';
import type { RegexSupportClient } from './RegexSupportClient';

const UNSUPPORTED_REGEX_MESSAGES: Record<string, string> = Object.freeze({
    syntaxError: "Chrome's RE2 engine rejects the regex syntax.",
    memoryLimitExceeded: "The regex is too large for Chrome's RE2 engine.",
});

const DEFAULT_UNSUPPORTED_MESSAGE = 'Chrome rejects the regex.';

export class ChromeRegexSupportClient implements RegexSupportClient {
    async checkAsync(regex: string): Promise<Result<void>> {
        try {
            const outcome = await chrome.declarativeNetRequest.isRegexSupported({
                regex,
            });
            if (outcome.isSupported) {
                return Result.done();
            }

            const message = UNSUPPORTED_REGEX_MESSAGES[outcome.reason ?? ''] ?? DEFAULT_UNSUPPORTED_MESSAGE;

            return Result.fail(message);
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }
}
