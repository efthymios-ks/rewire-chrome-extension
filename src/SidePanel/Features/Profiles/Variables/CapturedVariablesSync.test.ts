import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../../Common/Results/Result';
import type { RuleVariablesClient } from '../../../../Common/Storage/RuleVariablesClient';
import type { ProfileVariable } from '../../../../Contracts/Settings/ProfileVariable';
import type { PanelState } from '../../../Core/PanelState';
import { PanelStateFactory } from '../../../Core/PanelStateFactory';
import { Store } from '../../../Core/Store';
import { CapturedVariablesSync } from './CapturedVariablesSync';

const CAPTURED: ProfileVariable[] = [
    {
        name: 'token',
        value: 'abc',
    },
];

describe('CapturedVariablesSync', () => {
    test('startAsync_WhenStoredValuesLoad_ShouldPutThemInState', async () => {
        // Arrange
        const store = new Store<PanelState>(PanelStateFactory.initial());
        const client: RuleVariablesClient = {
            loadAsync: vi.fn().mockResolvedValue(Result.ok(CAPTURED)),
            subscribe: vi.fn(),
        };

        // Act
        await new CapturedVariablesSync({
            store,
            variablesClient: client,
            logger: {
                warn: vi.fn(),
                error: vi.fn(),
            },
        }).startAsync();

        // Assert
        expect(store.getState().capturedVariables).toEqual(CAPTURED);
    });

    test('startAsync_WhenARuleCapturesLater_ShouldFollowTheChange', async () => {
        // Arrange
        const store = new Store<PanelState>(PanelStateFactory.initial());
        let notify: (variables: ProfileVariable[]) => void = () => undefined;
        const client: RuleVariablesClient = {
            loadAsync: vi.fn().mockResolvedValue(Result.ok([])),
            subscribe: listener => {
                notify = listener;
            },
        };
        await new CapturedVariablesSync({
            store,
            variablesClient: client,
            logger: {
                warn: vi.fn(),
                error: vi.fn(),
            },
        }).startAsync();

        // Act
        notify(CAPTURED);

        // Assert
        expect(store.getState().capturedVariables).toEqual(CAPTURED);
    });

    test('startAsync_WhenLoadingFails_ShouldWarnAndKeepTheListEmpty', async () => {
        // Arrange
        const store = new Store<PanelState>(PanelStateFactory.initial());
        const warn = vi.fn();
        const client: RuleVariablesClient = {
            loadAsync: vi.fn().mockResolvedValue(Result.fail('Storage is gone.')),
            subscribe: vi.fn(),
        };

        // Act
        await new CapturedVariablesSync({
            store,
            variablesClient: client,
            logger: {
                warn,
                error: vi.fn(),
            },
        }).startAsync();

        // Assert
        expect(warn).toHaveBeenCalledWith('Storage is gone.');
        expect(store.getState().capturedVariables).toEqual([]);
    });
});
