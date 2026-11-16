import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../Common/Results/Result';
import type { SettingsStorageClient } from '../../Common/Storage/SettingsStorageClient';
import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import { Notifier } from './Notifier';
import { PanelStateFactory } from './PanelStateFactory';
import { SettingsService } from './SettingsService';
import { Store } from './Store';
import { aProfile, aRule, aSettings, aSettingsWithRules } from '../../TestData';

function setUp(settings: PanelSettings) {
    const store = new Store({
        ...PanelStateFactory.initial(),
        settings,
    });
    const storageClient: SettingsStorageClient = {
        loadAsync: vi.fn().mockResolvedValue(Result.ok(settings)),
        saveAsync: vi.fn().mockResolvedValue(Result.done()),
        subscribe: vi.fn(),
    };
    const service = new SettingsService({
        store,
        storageClient,
        notifier: new Notifier(store),
        logger: {
            warn: vi.fn(),
            error: vi.fn(),
        },
    });

    return {
        store,
        service,
    };
}

describe('SettingsService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('removeRuleAsync_WhenUndoIsPressed_ShouldPutTheRuleBackInPlace', async () => {
        // Arrange
        const { store, service } = setUp(aSettingsWithRules([
            aRule({
                id: 'a',
            }),
            aRule({
                id: 'b',
            }),
            aRule({
                id: 'c',
            }),
        ]));
        await service.removeRuleAsync('b');

        // Act
        store.getState().notice?.action?.run();

        // Assert
        expect(service.activeRules().map(rule => rule.id)).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    test('duplicateRuleAsync_WhenCalled_ShouldPlaceTheCopyAfterTheOriginal', async () => {
        // Arrange
        const { service } = setUp(aSettingsWithRules([
            aRule({
                id: 'a',
            }),
            aRule({
                id: 'b',
            }),
        ]));

        // Act
        await service.duplicateRuleAsync('a');

        // Assert
        expect(service.activeRules().map(rule => rule.name)).toEqual([
            'Users mock',
            'Users mock copy',
            'Users mock',
        ]);
    });

    test('saveRuleAsync_WhenAnotherProfileIsActive_ShouldOnlyChangeTheActiveProfile', async () => {
        // Arrange
        const { service } = setUp(aSettings({
            activeProfileId: 'staging',
            profiles: [
                aProfile({
                    id: 'local',
                    rules: [
                        aRule({
                            id: 'a',
                        }),
                    ],
                }),
                aProfile({
                    id: 'staging',
                }),
            ],
        }));

        // Act
        await service.saveRuleAsync(aRule({
            id: 'b',
        }));

        // Assert
        expect(service.current().profiles.map(profile => profile.rules.map(rule => rule.id))).toEqual([
            ['a'],
            ['b'],
        ]);
    });

    test('removeRuleAsync_WhenUndoIsPressedAfterSwitchingProfile_ShouldRestoreIntoTheOriginalProfile', async () => {
        // Arrange
        const { store, service } = setUp(aSettings({
            activeProfileId: 'local',
            profiles: [
                aProfile({
                    id: 'local',
                    rules: [
                        aRule({
                            id: 'a',
                        }),
                    ],
                }),
                aProfile({
                    id: 'staging',
                }),
            ],
        }));
        await service.removeRuleAsync('a');
        await service.switchProfileAsync('staging');

        // Act
        store.getState().notice?.action?.run();

        // Assert
        expect(service.current().profiles.map(profile => profile.rules.map(rule => rule.id))).toEqual([
            ['a'],
            [],
        ]);
    });

    test('createProfileAsync_WhenCalled_ShouldAddAnEmptyProfileAndActivateIt', async () => {
        // Arrange
        const { service } = setUp(aSettingsWithRules([aRule()]));

        // Act
        await service.createProfileAsync();

        // Assert
        const settings = service.current();
        expect(settings.profiles.map(profile => profile.name)).toEqual([
            'Default',
            'Profile',
        ]);
        expect(settings.activeProfileId).toBe(settings.profiles[1]?.id);
        expect(service.activeRules()).toEqual([]);
    });

    test('removeProfileAsync_WhenItIsTheLastOne_ShouldRefuseAndSaySo', async () => {
        // Arrange
        const { store, service } = setUp(aSettingsWithRules([aRule()]));

        // Act
        const removed = await service.removeProfileAsync('default');

        // Assert
        expect(removed.hasErrors).toBe(true);
        expect(service.current().profiles).toHaveLength(1);
        expect(store.getState().notice?.message).toBe('Keep at least one profile.');
    });

    test('saveVariablesAsync_WhenCalled_ShouldStoreThemOnTheActiveProfile', async () => {
        // Arrange
        const { service } = setUp(aSettings());
        const variables = [
            {
                name: 'baseUrl',
                value: 'http://localhost:5000',
            },
        ];

        // Act
        await service.saveVariablesAsync(variables);

        // Assert
        expect(service.current().profiles[0]?.variables).toEqual(variables);
    });
});
