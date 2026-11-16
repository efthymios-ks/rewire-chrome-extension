const PARTITION_SEPARATOR = '|';

export const CookieKeys = {
    partitionOf(partitionKey: chrome.cookies.CookiePartitionKey | undefined): string {
        if (partitionKey == null) {
            return '';
        }

        return [
            partitionKey.topLevelSite ?? '',
            String(partitionKey.hasCrossSiteAncestor ?? false),
        ].join(PARTITION_SEPARATOR);
    },

    of(cookie: chrome.cookies.Cookie): string {
        return JSON.stringify([
            cookie.name,
            cookie.domain,
            cookie.path,
            CookieKeys.partitionOf(cookie.partitionKey),
        ]);
    },
};
