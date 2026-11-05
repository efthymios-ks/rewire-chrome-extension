import { Result } from "../Results/Result";
import { SafeUrl } from "../Urls/SafeUrl";

const SupportedProtocols = [
    "http:",
    "https:",
];
const TrailingSlashesPattern = /\/+$/;

export const BaseUrl = {
    parse(text: string, fieldName: string): Result<string> {
        const parsed = SafeUrl.parse(text.trim());
        if (parsed === null) {
            return Result.fail(`${fieldName} must be an absolute URL, like https://api.example.com.`);
        }

        if (!SupportedProtocols.includes(parsed.protocol)) {
            return Result.fail(`${fieldName} must use http or https.`);
        }

        if (parsed.search !== "" || parsed.hash !== "") {
            return Result.fail(`${fieldName} can't carry a query or a fragment.`);
        }

        return Result.ok(`${parsed.origin}${parsed.pathname.replace(TrailingSlashesPattern, "")}`);
    },
};
