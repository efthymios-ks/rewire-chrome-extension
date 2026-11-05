import { SafeUrl } from "./SafeUrl";

export const EndpointKey = {
    create(method: string, url: string): string {
        const upperMethod = method.toUpperCase();
        const parsed = SafeUrl.parse(url);
        if (parsed === null) {
            return `${upperMethod} ${url}`;
        }

        return `${upperMethod} ${parsed.origin}${parsed.pathname}`;
    },
};
