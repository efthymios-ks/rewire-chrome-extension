const SEPARATOR = ':';

function prefixOf(tabId: number): string {
    return `${tabId}${SEPARATOR}`;
}

export const TabScopedKey = {
    of(tabId: number, id: string): string {
        return `${prefixOf(tabId)}${id}`;
    },

    isOfTab(key: string, tabId: number): boolean {
        return key.startsWith(prefixOf(tabId));
    },
};
