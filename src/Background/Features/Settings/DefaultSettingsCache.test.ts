import { describe, expect, test, vi } from 'vitest';
import { DefaultSettingsCache } from './DefaultSettingsCache';
import { Result } from '../../../Common/Results/Result';
import type { SettingsStorageClient } from '../../../Common/Storage/SettingsStorageClient';
import { DEFAULT_PANEL_SETTINGS } from '../../../Contracts/Settings/DefaultPanelSettings';
import type { PanelSettings } from '../../../Contracts/Settings/PanelSettings';
import { aSettings, createLogger } from '../../../TestData';

function createStorageClient(loaded: Result<PanelSettings> = Result.ok(aSettings())) {
    let storageListener: (settings: PanelSettings) => void = () => undefined;
    const storageClient: SettingsStorageClient = {
        loadAsync: vi.fn().mockResolvedValue(loaded),
        saveAsync: vi.fn().mockResolvedValue(Result.done()),
        subscribe: listener => {
            storageListener = listener;
        },
    };

    return {
        storageClient,
        changeStoredSettings: (settings: PanelSettings) => storageListener(settings),
    };
}

describe('DefaultSettingsCache', () => {
    test('current_WhenNotInitialized_ShouldReturnTheDefaults', () => {
        // Arrange
        const { storageClient } = createStorageClient();
        const cache = new DefaultSettingsCache(storageClient, createLogger());

        // Act
        const settings = cache.current();

        // Assert
        expect(settings).toBe(DEFAULT_PANEL_SETTINGS);
    });

    test('initializeAsync_WhenSettingsLoad_ShouldUseThem', async () => {
        // Arrange
        const stored = aSettings({
            interceptionEnabled: false,
        });
        const { storageClient } = createStorageClient(Result.ok(stored));
        const cache = new DefaultSettingsCache(storageClient, createLogger());

        // Act
        await cache.initializeAsync();

        // Assert
        expect(cache.current()).toBe(stored);
    });

    test('initializeAsync_WhenLoadingFails_ShouldLogAndKeepTheDefaults', async () => {
        // Arrange
        const { storageClient } = createStorageClient(Result.fail('Settings are corrupt.'));
        const logger = createLogger();
        const cache = new DefaultSettingsCache(storageClient, logger);

        // Act
        await cache.initializeAsync();

        // Assert
        expect(logger.error).toHaveBeenCalledWith('Settings are corrupt.');
        expect(cache.current()).toBe(DEFAULT_PANEL_SETTINGS);
    });

    test('subscribe_WhenStoredSettingsChange_ShouldUpdateAndNotify', async () => {
        // Arrange
        const { storageClient, changeStoredSettings } = createStorageClient();
        const cache = new DefaultSettingsCache(storageClient, createLogger());
        await cache.initializeAsync();
        const listener = vi.fn();
        cache.subscribe(listener);
        const changed = aSettings({
            pinnedEndpoints: ['GET https://api.example.com/orders'],
        });

        // Act
        changeStoredSettings(changed);

        // Assert
        expect(cache.current()).toBe(changed);
        expect(listener).toHaveBeenCalledWith(changed);
    });

    test('watch_WhenTheWatchedSliceChanges_ShouldCallBack', async () => {
        // Arrange
        const { storageClient, changeStoredSettings } = createStorageClient();
        const cache = new DefaultSettingsCache(storageClient, createLogger());
        await cache.initializeAsync();
        const onChange = vi.fn();
        cache.watch(settings => settings.interceptionEnabled, onChange);

        // Act
        changeStoredSettings(aSettings({
            interceptionEnabled: !cache.current().interceptionEnabled,
        }));

        // Assert
        expect(onChange).toHaveBeenCalledOnce();
    });

    test('watch_WhenOnlyOtherSettingsChange_ShouldNotCallBack', async () => {
        // Arrange
        const { storageClient, changeStoredSettings } = createStorageClient();
        const cache = new DefaultSettingsCache(storageClient, createLogger());
        await cache.initializeAsync();
        const onChange = vi.fn();
        cache.watch(settings => settings.interceptionEnabled, onChange);

        // Act
        changeStoredSettings(aSettings({
            pinnedEndpoints: ['GET https://api.example.com/orders'],
        }));

        // Assert
        expect(onChange).not.toHaveBeenCalled();
    });

    test('watch_WhenTheSliceChangesBackAndForth_ShouldCallBackForEachChange', async () => {
        // Arrange
        const { storageClient, changeStoredSettings } = createStorageClient();
        const cache = new DefaultSettingsCache(storageClient, createLogger());
        await cache.initializeAsync();
        const onChange = vi.fn();
        cache.watch(settings => settings.interceptionEnabled, onChange);
        const original = cache.current().interceptionEnabled;

        // Act
        changeStoredSettings(aSettings({
            interceptionEnabled: !original,
        }));
        changeStoredSettings(aSettings({
            interceptionEnabled: !original,
        }));
        changeStoredSettings(aSettings({
            interceptionEnabled: original,
        }));

        // Assert
        expect(onChange).toHaveBeenCalledTimes(2);
    });
});
