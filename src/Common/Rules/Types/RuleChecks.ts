import { StatusCodeLimits } from "../../../Contracts/Http/StatusCodePresets";
import { RegexCache } from "../Criteria/RegexCache";

const HeaderNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
export const RuleChecks = {
    headerName(name: string, label: string = "Header name"): string[] {
        return HeaderNamePattern.test(name.trim()) ? [] : [`${label} is empty or has characters a header can't carry.`];
    },

    status(status: number | null, label: string = "Status"): string[] {
        if (status === null) {
            return [];
        }

        const isValid = Number.isInteger(status) && status >= StatusCodeLimits.Min && status <= StatusCodeLimits.Max;

        return isValid ? [] : [`${label} must be a whole number from ${StatusCodeLimits.Min} to ${StatusCodeLimits.Max}.`];
    },

    required(text: string, label: string): string[] {
        return text.trim() === "" ? [`${label} is required.`] : [];
    },

    regex(source: string, label: string): string[] {
        const compiled = RegexCache.compile(source);

        return compiled.hasErrors ? [`${label} is invalid: ${compiled.error}`] : [];
    },
};
