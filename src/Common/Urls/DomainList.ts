const DOMAIN_SEPARATOR_PATTERN = /[\s,;]+/;
const WILDCARD_PREFIX = '*.';

function normalize(domain: string): string {
    const trimmed = domain
        .trim()
        .toLowerCase();
    const normalized = trimmed.startsWith(WILDCARD_PREFIX)
        ? trimmed.slice(WILDCARD_PREFIX.length)
        : trimmed;

    return normalized
        .replace(/^\.+/, '')
        .replace(/\.+$/, '');
}

export const DomainList = {
    parse(text: string): string[] {
        const domains = text
            .split(DOMAIN_SEPARATOR_PATTERN)
            .map(normalize)
            .filter(domain => domain.length > 0);

        return [...new Set(domains)];
    },

    format(domains: string[]): string {
        return domains.join(', ');
    },
};
