import type { STORAGE_AREA_NAMES } from './StorageAreaNames';
import type { STORAGE_KEYS } from './StorageKeys';

export interface StorageKeySubscription {
    areaName: (typeof STORAGE_AREA_NAMES)[keyof typeof STORAGE_AREA_NAMES];
    key: (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
    listener: (newValue: unknown) => void;
}

export function subscribeToStorageKey({ areaName, key, listener }: StorageKeySubscription): void {
    chrome.storage.onChanged.addListener((changes, changedAreaName) => {
        const change = changes[key];
        if (changedAreaName !== areaName || change == null) {
            return;
        }

        listener(change.newValue);
    });
}
