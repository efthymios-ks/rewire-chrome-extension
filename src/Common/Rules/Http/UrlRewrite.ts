import { SafeUrl } from '../../Urls/SafeUrl';
import { WildcardPattern } from '../../Urls/WildcardPattern';

const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';

export interface QueryParam {
    key: string;
    value: string;
}

export interface AppendQueryParamOptions {
    url: string;
    key: string;
    value: string;
}

export const UrlRewrite = {
    removeQueryParams(url: string, keyPatterns: string[]): string {
        const parsed = SafeUrl.parse(url);
        if (parsed == null) {
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
        if (parsed == null) {
            return url;
        }

        params.forEach(param => parsed.searchParams.set(param.key, param.value));

        return parsed.toString();
    },

    appendQueryParam({ url, key, value }: AppendQueryParamOptions): string {
        const parsed = SafeUrl.parse(url);
        if (parsed == null) {
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
        if (parsed == null || parsed.protocol !== HTTP_PROTOCOL) {
            return url;
        }

        parsed.protocol = HTTPS_PROTOCOL;

        return parsed.toString();
    },
};
