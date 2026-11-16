import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import type { RuleHitsClient } from '../../../Common/Storage/RuleHitsClient';
import type { RuleHit } from '../../../Contracts/Rules/RuleHit';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import { RuleHitsSync } from './RuleHitsSync';

function aSync(loaded: Result<RuleHit[]>) {
    const store = new Store<PanelState>(PanelStateFactory.initial());
    const hitsClient: RuleHitsClient = {
        loadAsync: vi.fn().mockResolvedValue(loaded),
        saveAsync: vi.fn().mockResolvedValue(Result.done()),
        subscribe: vi.fn(),
    };
    const logger = {
        warn: vi.fn(),
        error: vi.fn(),
    };
    const sync = new RuleHitsSync({
        store,
        hitsClient,
        logger,
    });

    return {
        sync,
        store,
        hitsClient,
        logger,
    };
}

describe('RuleHitsSync', () => {
    test('startAsync_WhenHitsLoad_ShouldMapThemByRuleId', async () => {
        // Arrange
        const { sync, store } = aSync(Result.ok([
            {
                ruleId: 'rule-1',
                count: 3,
            },
            {
                ruleId: 'rule-2',
                count: 0,
            },
        ]));

        // Act
        await sync.startAsync();

        // Assert
        expect(store.getState().ruleHits).toEqual({
            'rule-1': 3,
            'rule-2': 0,
        });
    });

    test('startAsync_WhenLoadingFails_ShouldWarnAndKeepTheHits', async () => {
        // Arrange
        const { sync, store, logger } = aSync(Result.fail('Storage unavailable'));
        store.update(state => ({
            ...state,
            ruleHits: {
                'rule-1': 5,
            },
        }));

        // Act
        await sync.startAsync();

        // Assert
        expect(logger.warn).toHaveBeenCalledWith('Storage unavailable');
        expect(store.getState().ruleHits).toEqual({
            'rule-1': 5,
        });
    });

    test('startAsync_WhenTheHitsChangeLater_ShouldReplaceThemInTheStore', async () => {
        // Arrange
        const { sync, store, hitsClient } = aSync(Result.ok([
            {
                ruleId: 'rule-1',
                count: 1,
            },
        ]));
        await sync.startAsync();
        const listener = vi.mocked(hitsClient.subscribe).mock.calls[0]![0];

        // Act
        listener([
            {
                ruleId: 'rule-2',
                count: 9,
            },
        ]);

        // Assert
        expect(store.getState().ruleHits).toEqual({
            'rule-2': 9,
        });
    });
});
