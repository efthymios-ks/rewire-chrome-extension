import { STATUS_CODE_LIMITS } from '../../../Contracts/Http/StatusCodeLimits';
import { RegexCache } from '../../Regex/RegexCache';

const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
export const RuleChecks = {
    headerName(name: string, label: string = 'Header name'): string[] {
        return HEADER_NAME_PATTERN.test(name.trim())
            ? []
            : [`${label} is empty or has characters a header can't carry.`];
    },

    status(status: number | null, label: string = 'Status'): string[] {
        if (status == null) {
            return [];
        }

        const isValid = Number.isInteger(status)
            && status >= STATUS_CODE_LIMITS.Min
            && status <= STATUS_CODE_LIMITS.Max;

        return isValid
            ? []
            : [`${label} must be a whole number from ${STATUS_CODE_LIMITS.Min} to ${STATUS_CODE_LIMITS.Max}.`];
    },

    required(text: string, label: string): string[] {
        return text.trim() === '' ? [`${label} is required.`] : [];
    },

    regex(source: string, label: string): string[] {
        const compiled = RegexCache.compile(source);

        return compiled.hasErrors ? [`${label} is invalid: ${compiled.error}`] : [];
    },
};
