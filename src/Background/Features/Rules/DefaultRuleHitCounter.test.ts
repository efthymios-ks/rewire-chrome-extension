import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { DnrFeedbackClient } from '../NetworkRules/DnrFeedbackClient';
import { DefaultRuleHitCounter } from './DefaultRuleHitCounter';
import { Result } from '../../../Common/Results/Result';
import type { RuleHitsClient } from '../../../Common/Storage/RuleHitsClient';
import type { RuleHit } from '../../../Contracts/Rules/RuleHit';
import { createLogger } from '../../../TestData';

const PERSIST_DELAY_IN_MILLISECONDS = 1000;

function setUp(stored: RuleHit[] = [], hasDebugFeedback: boolean = true) {
    let debugListener: (dnrRuleId: number) => void = () => undefined;
    const feedback: DnrFeedbackClient = {
        subscribeDebug: listener => {
            debugListener = listener;

            return hasDebugFeedback;
        },
        matchedSinceAsync: vi.fn().mockResolvedValue(Result.ok([])),
    };
    const save = vi.fn<(hits: RuleHit[]) => Promise<Result<void>>>().mockResolvedValue(Result.done());
    const hitsClient: RuleHitsClient = {
        loadAsync: vi.fn().mockResolvedValue(Result.ok(stored)),
        saveAsync: save,
        subscribe: vi.fn(),
    };
    const counter = new DefaultRuleHitCounter({
        feedback,
        hitsClient,
        logger: createLogger(),
    });

    return {
        counter,
        save,
        feedback,
        matchDebug: (dnrRuleId: number) => debugListener(dnrRuleId),
    };
}

describe('DefaultRuleHitCounter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('count_WhenCountsWereStored_ShouldContinueFromThem', async () => {
        // Arrange
        const { counter, save } = setUp([
            {
                ruleId: 'rule-1',
                count: 4,
            },
        ]);
        await counter.initializeAsync();

        // Act
        counter.count('rule-1');
        await vi.advanceTimersByTimeAsync(PERSIST_DELAY_IN_MILLISECONDS);

        // Assert
        expect(save).toHaveBeenCalledWith([
            {
                ruleId: 'rule-1',
                count: 5,
            },
        ]);
    });

    test('count_WhenCalledSeveralTimesQuickly_ShouldSaveOnce', async () => {
        // Arrange
        const { counter, save } = setUp();
        await counter.initializeAsync();

        // Act
        counter.count('rule-1');
        counter.count('rule-1');
        counter.count('rule-2');
        await vi.advanceTimersByTimeAsync(PERSIST_DELAY_IN_MILLISECONDS);

        // Assert
        expect(save).toHaveBeenCalledOnce();
        expect(save.mock.calls[0]?.[0]).toEqual([
            {
                ruleId: 'rule-1',
                count: 2,
            },
            {
                ruleId: 'rule-2',
                count: 1,
            },
        ]);
    });

    test('initializeAsync_WhenABrowserRuleMatches_ShouldCountItsOwner', async () => {
        // Arrange
        const { counter, save, matchDebug } = setUp();
        await counter.initializeAsync();
        counter.setOwners([
            {
                dnrRuleId: 3,
                ruleId: 'rule-3',
            },
        ]);

        // Act
        matchDebug(3);
        matchDebug(99);
        await vi.advanceTimersByTimeAsync(PERSIST_DELAY_IN_MILLISECONDS);

        // Assert
        expect(save).toHaveBeenCalledWith([
            {
                ruleId: 'rule-3',
                count: 1,
            },
        ]);
    });

    test('startPolling_WhenDebugFeedbackExists_ShouldNotPoll', async () => {
        // Arrange
        const { counter, feedback } = setUp();
        await counter.initializeAsync();

        // Act
        counter.startPolling();
        await vi.advanceTimersByTimeAsync(60_000);

        // Assert
        expect(feedback.matchedSinceAsync).not.toHaveBeenCalled();
    });

    test('startPolling_WhenOnlyFeedbackPermissionExists_ShouldPollMatchedRules', async () => {
        // Arrange
        const { counter, feedback } = setUp([], false);
        await counter.initializeAsync();

        // Act
        counter.startPolling();
        await vi.advanceTimersByTimeAsync(60_000);
        counter.stopPolling();

        // Assert
        expect(feedback.matchedSinceAsync).toHaveBeenCalledOnce();
    });
});
