import { SerialTaskQueue } from "../../../Common/Async/SerialTaskQueue";
import type { ILogger } from "../../../Common/Logging/ILogger";
import type { IRuleSyncReportClient } from "../../../Common/Storage/IRuleSyncReportClient";
import type { RuleSyncFailure } from "../../../Contracts/RuleSync/RuleSyncFailure";
import type { IActiveRules } from "../Rules/ActiveRules";
import type { IRuleHitCounter } from "../Rules/RuleHitCounter";
import { BrowserRuleCompiler, type CompiledRule } from "./BrowserRuleCompiler";
import type { IDeclarativeNetRequestClient } from "./IDeclarativeNetRequestClient";
import type { ITimeWindowScheduler } from "./TimeWindowScheduler";

export interface DeclarativeRuleSyncDependencies {
    activeRules: IActiveRules;
    netRequestClient: IDeclarativeNetRequestClient;
    reportClient: IRuleSyncReportClient;
    hitCounter: IRuleHitCounter;
    timeWindowScheduler: ITimeWindowScheduler;
    logger: ILogger;
}

function failureOf(compiled: CompiledRule, message: string): RuleSyncFailure {
    return {
        sourceName: compiled.sourceName,
        settingId: compiled.settingId,
        message,
    };
}

export class DeclarativeRuleSync {
    private readonly _dependencies: DeclarativeRuleSyncDependencies;
    private readonly _queue = new SerialTaskQueue();

    constructor(dependencies: DeclarativeRuleSyncDependencies) {
        this._dependencies = dependencies;
    }

    sync(): Promise<void> {
        return this._queue.enqueue(() => this.run());
    }

    private async run(): Promise<void> {
        const { activeRules, reportClient, hitCounter, timeWindowScheduler, logger } = this._dependencies;
        const ruleSet = activeRules.isEnabled()
            ? BrowserRuleCompiler.compile(activeRules.plans())
            : {
                rules: [],
                failures: [],
            };
        const failures = [...ruleSet.failures];
        const supported = await this.keepSupportedRegexes(ruleSet.rules, failures);
        const applied = await this.apply(supported, failures);
        hitCounter.setOwners(BrowserRuleCompiler.ownersOf(applied));
        await timeWindowScheduler.schedule(activeRules.isEnabled() ? activeRules.plans() : []);

        const saved = await reportClient.save({
            syncedAt: new Date().toISOString(),
            activeRuleCount: applied.length,
            failures,
        });
        if (saved.hasErrors) {
            logger.error(saved.error);
        }
    }

    private async keepSupportedRegexes(rules: CompiledRule[], failures: RuleSyncFailure[]): Promise<CompiledRule[]> {
        const supported: CompiledRule[] = [];
        for (const compiled of rules) {
            const regexFilter = compiled.rule.condition.regexFilter;
            if (regexFilter === undefined) {
                supported.push(compiled);
                continue;
            }

            const check = await this._dependencies.netRequestClient.checkRegex(regexFilter);
            if (check.hasErrors) {
                failures.push(failureOf(compiled, check.error));
                continue;
            }

            supported.push(compiled);
        }

        return supported;
    }

    private async apply(rules: CompiledRule[], failures: RuleSyncFailure[]): Promise<CompiledRule[]> {
        const { netRequestClient, logger } = this._dependencies;
        const replaced = await netRequestClient.replaceAll(rules.map(compiled => compiled.rule));
        if (!replaced.hasErrors) {
            return rules;
        }

        logger.warn("Bulk rule update failed, adding rules one by one.", replaced.error);

        const removed = await netRequestClient.removeAll();
        if (removed.hasErrors) {
            logger.error("Clearing network rules failed.", removed.error);

            return [];
        }

        const applied: CompiledRule[] = [];
        for (const compiled of rules) {
            const added = await netRequestClient.add(compiled.rule);
            if (added.hasErrors) {
                failures.push(failureOf(compiled, added.error));
                continue;
            }

            applied.push(compiled);
        }

        return applied;
    }
}
