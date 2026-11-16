import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import type { RuleSyncReportClient } from '../../../Common/Storage/RuleSyncReportClient';
import type { RuleSyncReport } from '../../../Contracts/RuleSync/RuleSyncReport';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import { RuleSyncReportSync } from './RuleSyncReportSync';

const REPORT: RuleSyncReport = Object.freeze({
    syncedAt: '2026-11-05T10:00:00.000Z',
    activeRuleCount: 1,
    failures: [],
});

function setUp(loaded: Result<RuleSyncReport | null>) {
    const store = new Store(PanelStateFactory.initial());
    let pushReport: (report: RuleSyncReport | null) => void = () => {};
    const reportClient: RuleSyncReportClient = {
        loadAsync: vi.fn().mockResolvedValue(loaded),
        saveAsync: vi.fn().mockResolvedValue(Result.done()),
        subscribe: listener => {
            pushReport = listener;
        },
    };
    const logger = {
        warn: vi.fn(),
        error: vi.fn(),
    };
    const sync = new RuleSyncReportSync({
        store,
        reportClient,
        logger,
    });

    return {
        store,
        logger,
        sync,
        push: (report: RuleSyncReport | null) => pushReport(report),
    };
}

describe('RuleSyncReportSync', () => {
    test('startAsync_WhenAReportIsStored_ShouldPutItInTheState', async () => {
        // Arrange
        const { store, sync } = setUp(Result.ok(REPORT));

        // Act
        await sync.startAsync();

        // Assert
        expect(store.getState().ruleSyncReport).toBe(REPORT);
    });

    test('startAsync_WhenNoReportIsStored_ShouldLeaveItEmpty', async () => {
        // Arrange
        const { store, sync } = setUp(Result.ok(null));

        // Act
        await sync.startAsync();

        // Assert
        expect(store.getState().ruleSyncReport).toBeNull();
    });

    test('startAsync_WhenLoadingFails_ShouldLogAndKeepTheState', async () => {
        // Arrange
        const { store, logger, sync } = setUp(Result.fail('Storage is unavailable.'));
        const before = store.getState();

        // Act
        await sync.startAsync();

        // Assert
        expect(logger.error).toHaveBeenCalledWith('Storage is unavailable.');
        expect(store.getState()).toBe(before);
    });

    test('startAsync_WhenTheStoredReportChangesLater_ShouldFollowIt', async () => {
        // Arrange
        const { store, sync, push } = setUp(Result.ok(null));
        await sync.startAsync();

        // Act
        push(REPORT);

        // Assert
        expect(store.getState().ruleSyncReport).toBe(REPORT);
    });
});
