import { SafeUrl } from "../../Urls/SafeUrl";
import { WildcardPattern } from "../../Urls/WildcardPattern";

const HttpProtocol = "http:";
const HttpsProtocol = "https:";
const TrailingSlashesPattern = /\/+$/;
const PathSuffixCharacters = [
    "/",
    "?",
    "#",
];

export interface QueryParam {
    key: string;
    value: string;
    replaceOnly: boolean;
}

export const UrlRewrite = {
    trimBase(base: string): string {
        return base.trim().replace(TrailingSlashesPattern, "");
    },

    isUnderBase(url: string, base: string): boolean {
        const trimmedBase = UrlRewrite.trimBase(base);
        if (trimmedBase === "" || !url.startsWith(trimmedBase)) {
            return false;
        }

        const next = url.charAt(trimmedBase.length);

        return next === "" || PathSuffixCharacters.includes(next);
    },

    replaceBase(
        url: string,
        sourceBase: string,
        targetBase: string
    ): string | null {
        if (!UrlRewrite.isUnderBase(url, sourceBase)) {
            return null;
        }

        return UrlRewrite.trimBase(targetBase) + url.slice(UrlRewrite.trimBase(sourceBase).length);
    },

    removeQueryParams(url: string, keyPatterns: string[]): string {
        const parsed = SafeUrl.parse(url);
        if (parsed === null) {
            return url;
        }

        const keys = [...parsed.searchParams.keys()];
        keys
            .filter(key => keyPatterns.some(pattern => WildcardPattern.matches(pattern, key)))
            .forEach(key => parsed.searchParams.delete(key));

        return parsed.toString();
    },

    addOrReplaceQueryParams(url: string, params: QueryParam[]): string {
        const parsed = SafeUrl.parse(url);
        if (parsed === null) {
            return url;
        }

        params
            .filter(param => !param.replaceOnly || parsed.searchParams.has(param.key))
            .forEach(param => parsed.searchParams.set(param.key, param.value));

        return parsed.toString();
    },

    appendQueryParam(
        url: string,
        key: string,
        value: string
    ): string {
        const parsed = SafeUrl.parse(url);
        if (parsed === null) {
            return url;
        }

        parsed.searchParams.append(key, value);

        return parsed.toString();
    },

    hasQueryParam(url: string, key: string): boolean {
        return SafeUrl.parse(url)?.searchParams.has(key) === true;
    },

    upgradeScheme(url: string): string {
        const parsed = SafeUrl.parse(url);
        if (parsed === null || parsed.protocol !== HttpProtocol) {
            return url;
        }

        parsed.protocol = HttpsProtocol;

        return parsed.toString();
    },
};
