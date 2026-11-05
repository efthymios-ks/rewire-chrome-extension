import { describe, expect, test, vi } from "vitest";
import { DeclarativeRuleSync } from "../../../../src/Background/Features/NetworkRules/DeclarativeRuleSync";
import type { IDeclarativeNetRequestClient } from "../../../../src/Background/Features/NetworkRules/IDeclarativeNetRequestClient";
import { Result } from "../../../../src/Common/Results/Result";
import type { IRuleSyncReportClient } from "../../../../src/Common/Storage/IRuleSyncReportClient";
import type { Rule } from "../../../../src/Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import type { RuleSyncReport } from "../../../../src/Contracts/RuleSync/RuleSyncReport";
import { aCriterion, aRule } from "../../../TestData";
import { activeRulesOf, createHitCounterMock, createLogger } from "../../BackgroundTestData";

function headerRule(id: string): Rule {
    return aRule({
        id,
        type: RuleTypeIds.RequestHeader,
        criteria: {
            match: "all",
            items: [],
        },
        action: {
            operations: [
                {
                    op: "set",
                    name: "X-Debug",
                    value: "1",
                },
            ],
        },
    });
}

function setUp(rules: Rule[], isEnabled: boolean = true) {
    const netRequestClient = {
        replaceAll: vi.fn().mockResolvedValue(Result.done()),
        removeAll: vi.fn().mockResolvedValue(Result.done()),
        add: vi.fn().mockResolvedValue(Result.done()),
        checkRegex: vi.fn().mockResolvedValue(Result.done()),
    } satisfies IDeclarativeNetRequestClient;
    const save = vi.fn<(report: RuleSyncReport) => Promise<Result<void>>>().mockResolvedValue(Result.done());
    const reportClient: IRuleSyncReportClient = {
        load: vi.fn(),
        save,
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
            schedule,
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

describe("DeclarativeRuleSync", () => {
    test("sync_WhenRulesCompile_ShouldReplaceAllAndReportTheCount", async () => {
        // Arrange
        const { sync, netRequestClient, save, setOwners } = setUp([headerRule("first")]);

        // Act
        await sync.sync();

        // Assert
        expect(netRequestClient.replaceAll).toHaveBeenCalledOnce();
        expect(save.mock.calls[0]?.[0]).toMatchObject({
            activeRuleCount: 1,
            failures: [],
        });
        expect(setOwners).toHaveBeenCalledWith([
            {
                dnrRuleId: 1,
                ruleId: "first",
            },
        ]);
    });

    test("sync_WhenInterceptionIsOff_ShouldClearEveryRule", async () => {
        // Arrange
        const { sync, netRequestClient, schedule } = setUp([headerRule("first")], false);

        // Act
        await sync.sync();

        // Assert
        expect(netRequestClient.replaceAll).toHaveBeenCalledWith([]);
        expect(schedule).toHaveBeenCalledWith([]);
    });

    test("sync_WhenTheBulkUpdateFails_ShouldAddRulesOneByOneAndReportFailures", async () => {
        // Arrange
        const { sync, netRequestClient, save } = setUp([
            headerRule("first"),
            headerRule("second"),
        ]);
        netRequestClient.replaceAll.mockResolvedValue(Result.fail("Too many rules"));
        netRequestClient.add
            .mockResolvedValueOnce(Result.done())
            .mockResolvedValueOnce(Result.fail("Bad rule"));

        // Act
        await sync.sync();

        // Assert
        expect(netRequestClient.removeAll).toHaveBeenCalledOnce();
        expect(save.mock.calls[0]?.[0]).toMatchObject({
            activeRuleCount: 1,
            failures: [
                {
                    settingId: "second",
                    message: "Bad rule",
                },
            ],
        });
    });

    test("sync_WhenARegexIsNotSupported_ShouldSkipItAndReportIt", async () => {
        // Arrange
        const rule = aRule({
            id: "regex",
            type: RuleTypeIds.Rewrite,
            criteria: {
                match: "all",
                items: [
                    aCriterion({
                        op: "regex",
                        value: "^https://api\\.example\\.com/(.*)$",
                    }),
                ],
            },
            action: {
                target: "http://localhost:5000/$1",
            },
        });
        const { sync, netRequestClient, save } = setUp([rule]);
        netRequestClient.checkRegex.mockResolvedValue(Result.fail("Regex too large"));

        // Act
        await sync.sync();

        // Assert
        expect(netRequestClient.replaceAll).toHaveBeenCalledWith([]);
        expect(save.mock.calls[0]?.[0].failures).toEqual([
            expect.objectContaining({
                settingId: "regex",
                message: "Regex too large",
            }),
        ]);
    });
});
