const DomainSeparatorPattern = /[\s,;]+/;
const WildcardPrefix = "*.";

function normalize(domain: string): string {
    let normalized = domain
        .trim()
        .toLowerCase();

    if (normalized.startsWith(WildcardPrefix)) {
        normalized = normalized.slice(WildcardPrefix.length);
    }

    return normalized
        .replace(/^\.+/, "")
        .replace(/\.+$/, "");
}

export const DomainList = {
    parse(text: string): string[] {
        const domains = text
            .split(DomainSeparatorPattern)
            .map(normalize)
            .filter(domain => domain.length > 0);

        return [...new Set(domains)];
    },

    format(domains: string[]): string {
        return domains.join(", ");
    },
};
