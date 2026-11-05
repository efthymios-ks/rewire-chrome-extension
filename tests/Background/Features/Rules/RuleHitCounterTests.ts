import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { IDnrFeedbackClient } from "../../../../src/Background/Features/NetworkRules/DnrFeedbackClient";
import { RuleHitCounter } from "../../../../src/Background/Features/Rules/RuleHitCounter";
import { Result } from "../../../../src/Common/Results/Result";
import type { IRuleHitsClient } from "../../../../src/Common/Storage/IRuleHitsClient";
import type { RuleHit } from "../../../../src/Contracts/Rules/RuleHit";
import { createLogger } from "../../BackgroundTestData";

const PersistDelayInMilliseconds = 1000;

function setUp(stored: RuleHit[] = [], hasDebugFeedback: boolean = true) {
    let debugListener: (dnrRuleId: number) => void = () => undefined;
    const feedback: IDnrFeedbackClient = {
        subscribeDebug: listener => {
            debugListener = listener;

            return hasDebugFeedback;
        },
        matchedSince: vi.fn().mockResolvedValue(Result.ok([])),
    };
    const save = vi.fn<(hits: RuleHit[]) => Promise<Result<void>>>().mockResolvedValue(Result.done());
    const hitsClient: IRuleHitsClient = {
        load: vi.fn().mockResolvedValue(Result.ok(stored)),
        save,
        subscribe: vi.fn(),
    };
    const counter = new RuleHitCounter(
        feedback,
        hitsClient,
        createLogger()
    );

    return {
        counter,
        save,
        feedback,
        matchDebug: (dnrRuleId: number) => debugListener(dnrRuleId),
    };
}

describe("RuleHitCounter", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test("count_WhenCountsWereStored_ShouldContinueFromThem", async () => {
        // Arrange
        const { counter, save } = setUp([
            {
                ruleId: "rule-1",
                count: 4,
            },
        ]);
        await counter.initialize();

        // Act
        counter.count("rule-1");
        await vi.advanceTimersByTimeAsync(PersistDelayInMilliseconds);

        // Assert
        expect(save).toHaveBeenCalledWith([
            {
                ruleId: "rule-1",
                count: 5,
            },
        ]);
    });

    test("count_WhenCalledSeveralTimesQuickly_ShouldSaveOnce", async () => {
        // Arrange
        const { counter, save } = setUp();
        await counter.initialize();

        // Act
        counter.count("rule-1");
        counter.count("rule-1");
        counter.count("rule-2");
        await vi.advanceTimersByTimeAsync(PersistDelayInMilliseconds);

        // Assert
        expect(save).toHaveBeenCalledOnce();
        expect(save.mock.calls[0]?.[0]).toEqual([
            {
                ruleId: "rule-1",
                count: 2,
            },
            {
                ruleId: "rule-2",
                count: 1,
            },
        ]);
    });

    test("initialize_WhenABrowserRuleMatches_ShouldCountItsOwner", async () => {
        // Arrange
        const { counter, save, matchDebug } = setUp();
        await counter.initialize();
        counter.setOwners([
            {
                dnrRuleId: 3,
                ruleId: "rule-3",
            },
        ]);

        // Act
        matchDebug(3);
        matchDebug(99);
        await vi.advanceTimersByTimeAsync(PersistDelayInMilliseconds);

        // Assert
        expect(save).toHaveBeenCalledWith([
            {
                ruleId: "rule-3",
                count: 1,
            },
        ]);
    });

    test("startPolling_WhenDebugFeedbackExists_ShouldNotPoll", async () => {
        // Arrange
        const { counter, feedback } = setUp();
        await counter.initialize();

        // Act
        counter.startPolling();
        await vi.advanceTimersByTimeAsync(60_000);

        // Assert
        expect(feedback.matchedSince).not.toHaveBeenCalled();
    });

    test("startPolling_WhenOnlyFeedbackPermissionExists_ShouldPollMatchedRules", async () => {
        // Arrange
        const { counter, feedback } = setUp([], false);
        await counter.initialize();

        // Act
        counter.startPolling();
        await vi.advanceTimersByTimeAsync(60_000);
        counter.stopPolling();

        // Assert
        expect(feedback.matchedSince).toHaveBeenCalledOnce();
    });
});
