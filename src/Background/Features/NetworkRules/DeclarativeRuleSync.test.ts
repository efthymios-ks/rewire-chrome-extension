import { describe, expect, test, vi } from 'vitest';
import { DeclarativeRuleSync } from './DeclarativeRuleSync';
import type { DeclarativeNetRequestClient } from './DeclarativeNetRequestClient';
import { Result } from '../../../Common/Results/Result';
import type { RuleSyncReportClient } from '../../../Common/Storage/RuleSyncReportClient';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import type { RuleSyncReport } from '../../../Contracts/RuleSync/RuleSyncReport';
import { aCriterion, aRule, createLogger } from '../../../TestData';
import { activeRulesOf, createHitCounterMock } from '../../BackgroundTestData';

function headerRule(id: string): Rule {
    return aRule({
        id,
        type: RULE_TYPE_IDS.RequestHeader,
        criteria: {
            match: 'all',
            items: [],
        },
        action: {
            operations: [
                {
                    op: 'set',
                    name: 'X-Debug',
                    value: '1',
                },
            ],
        },
    });
}

function setUp(rules: Rule[], isEnabled: boolean = true) {
    const netRequestClient = {
        replaceAllAsync: vi.fn().mockResolvedValue(Result.done()),
        removeAllAsync: vi.fn().mockResolvedValue(Result.done()),
        addAsync: vi.fn().mockResolvedValue(Result.done()),
        checkRegexAsync: vi.fn().mockResolvedValue(Result.done()),
    } satisfies DeclarativeNetRequestClient;
    const save = vi.fn<(report: RuleSyncReport) => Promise<Result<void>>>().mockResolvedValue(Result.done());
    const reportClient: RuleSyncReportClient = {
        loadAsync: vi.fn(),
        saveAsync: save,
        subscribe: vi.fn(),
    };
    const hitCounter = createHitCounterMock();
    const schedule = vi.fn().mockResolvedValue(undefined);
    const sync = new DeclarativeRuleSync({
        activeRules: activeRulesOf(rules, isEnabled),
        netRequestClient,
        reportClient,
        hitCounter: hitCounter.counter,
        timeWindowScheduler: {
            scheduleAsync: schedule,
        },
        logger: createLogger(),
    });

    return {
        sync,
        netRequestClient,
        save,
        setOwners: hitCounter.counter.setOwners,
        schedule,
    };
}

describe('DeclarativeRuleSync', () => {
    test('syncAsync_WhenRulesCompile_ShouldReplaceAllAndReportTheCount', async () => {
        // Arrange
        const { sync, netRequestClient, save, setOwners } = setUp([headerRule('first')]);

        // Act
        await sync.syncAsync();

        // Assert
        expect(netRequestClient.replaceAllAsync).toHaveBeenCalledOnce();
        expect(save.mock.calls[0]?.[0]).toMatchObject({
            activeRuleCount: 1,
            failures: [],
        });
        expect(setOwners).toHaveBeenCalledWith([
            {
                dnrRuleId: 1,
                ruleId: 'first',
            },
        ]);
    });

    test('syncAsync_WhenInterceptionIsOff_ShouldClearEveryRule', async () => {
        // Arrange
        const { sync, netRequestClient, schedule } = setUp([headerRule('first')], false);

        // Act
        await sync.syncAsync();

        // Assert
        expect(netRequestClient.replaceAllAsync).toHaveBeenCalledWith([]);
        expect(schedule).toHaveBeenCalledWith([]);
    });

    test('syncAsync_WhenTheBulkUpdateFails_ShouldAddRulesOneByOneAndReportFailures', async () => {
        // Arrange
        const { sync, netRequestClient, save } = setUp([
            headerRule('first'),
            headerRule('second'),
        ]);
        netRequestClient.replaceAllAsync.mockResolvedValue(Result.fail('Too many rules'));
        netRequestClient.addAsync
            .mockResolvedValueOnce(Result.done())
            .mockResolvedValueOnce(Result.fail('Bad rule'));

        // Act
        await sync.syncAsync();

        // Assert
        expect(netRequestClient.removeAllAsync).toHaveBeenCalledOnce();
        expect(save.mock.calls[0]?.[0]).toMatchObject({
            activeRuleCount: 1,
            failures: [
                {
                    ruleId: 'second',
                    message: 'Bad rule',
                },
            ],
        });
    });

    test('syncAsync_WhenARegexIsNotSupported_ShouldSkipItAndReportIt', async () => {
        // Arrange
        const rule = aRule({
            id: 'regex',
            type: RULE_TYPE_IDS.Rewrite,
            criteria: {
                match: 'all',
                items: [
                    aCriterion({
                        op: 'regex',
                        value: '^https://api\\.example\\.com/(.*)$',
                    }),
                ],
            },
            action: {
                target: 'http://localhost:5000/$1',
            },
        });
        const { sync, netRequestClient, save } = setUp([rule]);
        netRequestClient.checkRegexAsync.mockResolvedValue(Result.fail('Regex too large'));

        // Act
        await sync.syncAsync();

        // Assert
        expect(netRequestClient.replaceAllAsync).toHaveBeenCalledWith([]);
        expect(save.mock.calls[0]?.[0].failures).toEqual([
            expect.objectContaining({
                ruleId: 'regex',
                message: 'Regex too large',
            }),
        ]);
    });
});
