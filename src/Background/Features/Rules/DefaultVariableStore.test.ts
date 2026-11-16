import { afterEach, describe, expect, test, vi } from 'vitest';
import { DefaultVariableStore } from './DefaultVariableStore';
import { STORAGE_KEYS } from '../../../Common/Storage/StorageKeys';
import { createLogger } from '../../../TestData';

function stubChrome(stored: Record<string, unknown> = {}) {
    const get = vi.fn().mockResolvedValue(stored);
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
        storage: {
            session: {
                get,
                set,
            },
        },
    });

    return {
        get,
        set,
    };
}

describe('DefaultVariableStore', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('initializeAsync_WhenVariablesWereStored_ShouldLoadTheValidOnes', async () => {
        // Arrange
        stubChrome({
            [STORAGE_KEYS.RuleVariables]: [
                {
                    name: 'token',
                    value: 'abc',
                },
                {
                    name: 'count',
                    value: 3,
                },
                null,
                'tenant',
            ],
        });
        const store = new DefaultVariableStore(createLogger());

        // Act
        await store.initializeAsync();

        // Assert
        expect(store.snapshot()).toEqual(new Map([['token', 'abc']]));
    });

    test('initializeAsync_WhenTheStoredValueIsNotAList_ShouldStartEmpty', async () => {
        // Arrange
        stubChrome({
            [STORAGE_KEYS.RuleVariables]: {
                token: 'abc',
            },
        });
        const store = new DefaultVariableStore(createLogger());

        // Act
        await store.initializeAsync();

        // Assert
        expect(store.snapshot().size).toBe(0);
    });

    test('initializeAsync_WhenLoadingFails_ShouldLogAWarning', async () => {
        // Arrange
        const { get } = stubChrome();
        get.mockRejectedValue(new Error('Storage unavailable'));
        const logger = createLogger();
        const store = new DefaultVariableStore(logger);

        // Act
        await store.initializeAsync();

        // Assert
        expect(logger.warn).toHaveBeenCalledWith(
            /* message: */ 'Loading rule variables failed.',
            /* context: */ 'Storage unavailable',
        );
    });

    test('get_WhenTheVariableIsUnknown_ShouldReturnNull', () => {
        // Arrange
        stubChrome();
        const store = new DefaultVariableStore(createLogger());

        // Act
        const value = store.get('token');

        // Assert
        expect(value).toBeNull();
    });

    test('set_WhenTheValueIsNew_ShouldStoreSaveAndNotify', async () => {
        // Arrange
        const { set } = stubChrome();
        const store = new DefaultVariableStore(createLogger());
        const listener = vi.fn();
        store.subscribe(listener);

        // Act
        store.set('token', 'abc');

        // Assert
        expect(store.get('token')).toBe('abc');
        expect(listener).toHaveBeenCalledOnce();
        await vi.waitFor(() => expect(set).toHaveBeenCalledWith({
            [STORAGE_KEYS.RuleVariables]: [
                {
                    name: 'token',
                    value: 'abc',
                },
            ],
        }));
    });

    test('set_WhenTheValueIsUnchanged_ShouldNeitherSaveNorNotify', () => {
        // Arrange
        const { set } = stubChrome();
        const store = new DefaultVariableStore(createLogger());
        store.set('token', 'abc');
        set.mockClear();
        const listener = vi.fn();
        store.subscribe(listener);

        // Act
        store.set('token', 'abc');

        // Assert
        expect(set).not.toHaveBeenCalled();
        expect(listener).not.toHaveBeenCalled();
    });

    test('set_WhenSavingFails_ShouldLogAWarningAndKeepTheValue', async () => {
        // Arrange
        const { set } = stubChrome();
        set.mockRejectedValue(new Error('Quota exceeded'));
        const logger = createLogger();
        const store = new DefaultVariableStore(logger);

        // Act
        store.set('token', 'abc');

        // Assert
        await vi.waitFor(() => expect(logger.warn).toHaveBeenCalledWith(
            /* message: */ 'Saving rule variables failed.',
            /* context: */ 'Quota exceeded',
        ));
        expect(store.get('token')).toBe('abc');
    });

    test('snapshot_WhenTheCopyIsChanged_ShouldNotAffectTheStore', () => {
        // Arrange
        stubChrome();
        const store = new DefaultVariableStore(createLogger());
        store.set('token', 'abc');

        // Act
        store.snapshot().set('token', 'changed');

        // Assert
        expect(store.get('token')).toBe('abc');
    });
});
