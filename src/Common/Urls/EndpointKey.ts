import { SafeUrl } from './SafeUrl';

const KEY_SEPARATOR = ' ';

export interface EndpointKeyParts {
    method: string;
    url: string;
}

export const EndpointKey = {
    create(method: string, url: string): string {
        const upperMethod = method.toUpperCase();
        const parsed = SafeUrl.parse(url);
        if (parsed == null) {
            return `${upperMethod}${KEY_SEPARATOR}${url}`;
        }

        return `${upperMethod}${KEY_SEPARATOR}${parsed.origin}${parsed.pathname}`;
    },

    parse(key: string): EndpointKeyParts {
        const separatorIndex = key.indexOf(KEY_SEPARATOR);

        return {
            method: key.slice(0, separatorIndex),
            url: key.slice(separatorIndex + 1),
        };
    },
};
