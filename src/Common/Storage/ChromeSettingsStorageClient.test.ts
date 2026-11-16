import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeSettingsStorageClient } from './ChromeSettingsStorageClient';
import { PanelSettingsNormalizer } from './PanelSettingsNormalizer';
import { DEFAULT_PANEL_SETTINGS } from '../../Contracts/Settings/DefaultPanelSettings';
import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import { aRule, aSettingsWithRules } from '../../TestData';

type ChangeListener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => void;

interface StubChromeOptions {
    get?: () => Promise<unknown>;
    set?: (items: unknown) => Promise<void>;
}

function stubChrome({
    get = vi.fn().mockResolvedValue({}),
    set = vi.fn().mockResolvedValue(undefined),
}: StubChromeOptions): ChangeListener[] {
    const listeners: ChangeListener[] = [];
    vi.stubGlobal('chrome', {
        storage: {
            local: {
                get,
                set,
            },
            onChanged: {
                addListener: (listener: ChangeListener) => listeners.push(listener),
            },
        },
    });

    return listeners;
}

function storedAs(value: unknown): () => Promise<unknown> {
    return vi.fn().mockResolvedValue({
        panelSettings: value,
    });
}

describe('ChromeSettingsStorageClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('loadAsync_WhenStoredSettingsAreCurrent_ShouldReturnThemWithoutSaving', async () => {
        // Arrange
        const settings = aSettingsWithRules([aRule()]);
        const set = vi.fn().mockResolvedValue(undefined);
        stubChrome({
            get: storedAs(settings),
            set,
        });

        // Act
        const loaded = await new ChromeSettingsStorageClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: PanelSettingsNormalizer.normalize(settings),
        });
        expect(set).not.toHaveBeenCalled();
    });

    test('loadAsync_WhenNothingIsStored_ShouldReturnDefaultsWithoutSaving', async () => {
        // Arrange
        const set = vi.fn().mockResolvedValue(undefined);
        stubChrome({
            get: storedAs(undefined),
            set,
        });

        // Act
        const loaded = await new ChromeSettingsStorageClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: DEFAULT_PANEL_SETTINGS,
        });
        expect(set).not.toHaveBeenCalled();
    });

    test('loadAsync_WhenStoredSettingsAreAnOlderSchema_ShouldSaveTheMigratedSettings', async () => {
        // Arrange
        const stored = {
            schemaVersion: 2,
            rules: [aRule()],
        };
        const set = vi.fn().mockResolvedValue(undefined);
        stubChrome({
            get: storedAs(stored),
            set,
        });
        const migrated = PanelSettingsNormalizer.normalize(stored);

        // Act
        const loaded = await new ChromeSettingsStorageClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: migrated,
        });
        expect(set).toHaveBeenCalledWith({
            panelSettings: migrated,
        });
    });

    test('loadAsync_WhenSavingTheMigrationFails_ShouldFailWithTheSaveReason', async () => {
        // Arrange
        stubChrome({
            get: storedAs({
                schemaVersion: 2,
                rules: [],
            }),
            set: vi.fn().mockRejectedValue(new Error('Quota exceeded')),
        });

        // Act
        const loaded = await new ChromeSettingsStorageClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: true,
            error: 'Saving settings failed: Quota exceeded',
        });
    });

    test('loadAsync_WhenStorageThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubChrome({
            get: vi.fn().mockRejectedValue(new Error('Access denied')),
        });

        // Act
        const loaded = await new ChromeSettingsStorageClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: true,
            error: 'Loading settings failed: Access denied',
        });
    });

    test('saveAsync_WhenStorageAccepts_ShouldWriteTheSettingsUnderTheirKey', async () => {
        // Arrange
        const set = vi.fn().mockResolvedValue(undefined);
        stubChrome({
            set,
        });
        const settings = aSettingsWithRules([aRule()]);

        // Act
        const saved = await new ChromeSettingsStorageClient().saveAsync(settings);

        // Assert
        expect(saved).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(set).toHaveBeenCalledWith({
            panelSettings: settings,
        });
    });

    test('saveAsync_WhenStorageThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubChrome({
            set: vi.fn().mockRejectedValue('disk full'),
        });

        // Act
        const saved = await new ChromeSettingsStorageClient().saveAsync(DEFAULT_PANEL_SETTINGS);

        // Assert
        expect(saved).toEqual({
            hasErrors: true,
            error: 'Saving settings failed: disk full',
        });
    });

    test('subscribe_WhenLocalSettingsChange_ShouldPassOnlyThoseChangesNormalized', () => {
        // Arrange
        const listeners = stubChrome({});
        const received: PanelSettings[] = [];
        new ChromeSettingsStorageClient().subscribe(settings => received.push(settings));
        const settings = aSettingsWithRules([aRule()]);

        // Act
        listeners.forEach(listener => listener(
            /* changes: */ {
                panelSettings: {
                    newValue: settings,
                },
            },
            /* areaName: */ 'session',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleHits: {
                    newValue: [],
                },
            },
            /* areaName: */ 'local',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                panelSettings: {
                    newValue: settings,
                },
            },
            /* areaName: */ 'local',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                panelSettings: {},
            },
            /* areaName: */ 'local',
        ));

        // Assert
        expect(received).toEqual([
            PanelSettingsNormalizer.normalize(settings),
            DEFAULT_PANEL_SETTINGS,
        ]);
    });
});
