export const DomainMatcher = {
    matches(host: string, domain: string): boolean {
        const lowerHost = host.toLowerCase();

        return lowerHost === domain || lowerHost.endsWith(`.${domain}`);
    },

    matchesAny(host: string, domains: string[]): boolean {
        return domains.some(domain => DomainMatcher.matches(host, domain));
    },
};
