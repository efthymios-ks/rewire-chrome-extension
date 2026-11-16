import { afterEach, describe, expect, test, vi } from 'vitest';
import { STORAGE_AREA_NAMES } from './StorageAreaNames';
import { STORAGE_KEYS } from './StorageKeys';
import { subscribeToStorageKey } from './subscribeToStorageKey';

type StorageChanges = Record<string, { newValue?: unknown }>;
type ChangeListener = (changes: StorageChanges, areaName: string) => void;

function stubChrome(): ChangeListener {
    const listeners: ChangeListener[] = [];
    vi.stubGlobal('chrome', {
        storage: {
            onChanged: {
                addListener: (listener: ChangeListener) => listeners.push(listener),
            },
        },
    });

    return (changes, areaName) => listeners.forEach(listener => listener(changes, areaName));
}

describe('subscribeToStorageKey', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('subscribeToStorageKey_WhenTheKeyChangesInItsArea_ShouldPassTheNewValue', () => {
        // Arrange
        const emit = stubChrome();
        const received: unknown[] = [];
        subscribeToStorageKey({
            areaName: STORAGE_AREA_NAMES.Session,
            key: STORAGE_KEYS.RuleHits,
            listener: value => received.push(value),
        });

        // Act
        emit(
            /* changes: */ {
                ruleHits: {
                    newValue: ['hit'],
                },
            },
            /* areaName: */ 'session',
        );

        // Assert
        expect(received).toEqual([['hit']]);
    });

    test('subscribeToStorageKey_WhenTheKeyIsRemoved_ShouldPassUndefined', () => {
        // Arrange
        const emit = stubChrome();
        const received: unknown[] = [];
        subscribeToStorageKey({
            areaName: STORAGE_AREA_NAMES.Local,
            key: STORAGE_KEYS.PanelSettings,
            listener: value => received.push(value),
        });

        // Act
        emit(
            /* changes: */ {
                panelSettings: {},
            },
            /* areaName: */ 'local',
        );

        // Assert
        expect(received).toEqual([undefined]);
    });

    test('subscribeToStorageKey_WhenAnotherAreaOrKeyChanges_ShouldIgnoreIt', () => {
        // Arrange
        const emit = stubChrome();
        const listener = vi.fn();
        subscribeToStorageKey({
            areaName: STORAGE_AREA_NAMES.Session,
            key: STORAGE_KEYS.RuleHits,
            listener,
        });

        // Act
        emit(
            /* changes: */ {
                ruleHits: {
                    newValue: [],
                },
            },
            /* areaName: */ 'local',
        );
        emit(
            /* changes: */ {
                ruleVariables: {
                    newValue: [],
                },
            },
            /* areaName: */ 'session',
        );

        // Assert
        expect(listener).not.toHaveBeenCalled();
    });
});
