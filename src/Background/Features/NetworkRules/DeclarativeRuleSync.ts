import { SerialTaskQueue } from '../../../Common/Async/SerialTaskQueue';
import type { Logger } from '../../../Common/Logging/Logger';
import type { RuleSyncReportClient } from '../../../Common/Storage/RuleSyncReportClient';
import type { RuleSyncFailure } from '../../../Contracts/RuleSync/RuleSyncFailure';
import type { ActiveRules } from '../Rules/ActiveRules';
import type { RuleHitCounter } from '../Rules/RuleHitCounter';
import { BrowserRuleCompiler, type CompiledRule } from './BrowserRuleCompiler';
import type { DeclarativeNetRequestClient } from './DeclarativeNetRequestClient';
import type { TimeWindowScheduler } from './TimeWindowScheduler';

export interface DeclarativeRuleSyncDependencies {
    activeRules: ActiveRules;
    netRequestClient: DeclarativeNetRequestClient;
    reportClient: RuleSyncReportClient;
    hitCounter: RuleHitCounter;
    timeWindowScheduler: TimeWindowScheduler;
    logger: Logger;
}

function failureOf(compiled: CompiledRule, message: string): RuleSyncFailure {
    return {
        sourceName: compiled.sourceName,
        ruleId: compiled.settingId,
        message,
    };
}

export class DeclarativeRuleSync {
    private readonly _dependencies: DeclarativeRuleSyncDependencies;
    private readonly _queue = new SerialTaskQueue();

    constructor(dependencies: DeclarativeRuleSyncDependencies) {
        this._dependencies = dependencies;
    }

    syncAsync(): Promise<void> {
        return this._queue.enqueueAsync(() => this.runAsync());
    }

    private async runAsync(): Promise<void> {
        const { activeRules, reportClient, hitCounter, timeWindowScheduler, logger } = this._dependencies;
        const ruleSet = activeRules.isEnabled()
            ? BrowserRuleCompiler.compile(activeRules.plans())
            : {
                rules: [],
                failures: [],
            };
        const failures = [...ruleSet.failures];
        const supported = await this.keepSupportedRegexesAsync(ruleSet.rules, failures);
        const applied = await this.applyAsync(supported, failures);
        hitCounter.setOwners(BrowserRuleCompiler.ownersOf(applied));
        await timeWindowScheduler.scheduleAsync(activeRules.isEnabled() ? activeRules.plans() : []);

        const saved = await reportClient.saveAsync({
            syncedAt: new Date().toISOString(),
            activeRuleCount: applied.length,
            failures,
        });
        if (saved.hasErrors) {
            logger.error(saved.error);
        }
    }

    private async keepSupportedRegexesAsync(
        rules: CompiledRule[],
        failures: RuleSyncFailure[],
    ): Promise<CompiledRule[]> {
        const supported: CompiledRule[] = [];
        for (const compiled of rules) {
            const regexFilter = compiled.rule.condition.regexFilter;
            if (regexFilter == null) {
                supported.push(compiled);
                continue;
            }

            const check = await this._dependencies.netRequestClient.checkRegexAsync(regexFilter);
            if (check.hasErrors) {
                failures.push(failureOf(compiled, check.error));
                continue;
            }

            supported.push(compiled);
        }

        return supported;
    }

    private async applyAsync(rules: CompiledRule[], failures: RuleSyncFailure[]): Promise<CompiledRule[]> {
        const { netRequestClient, logger } = this._dependencies;
        const replaced = await netRequestClient.replaceAllAsync(rules.map(compiled => compiled.rule));
        if (!replaced.hasErrors) {
            return rules;
        }

        logger.warn('Bulk rule update failed, adding rules one by one.', replaced.error);

        const removed = await netRequestClient.removeAllAsync();
        if (removed.hasErrors) {
            logger.error('Clearing network rules failed.', removed.error);

            return [];
        }

        const applied: CompiledRule[] = [];
        for (const compiled of rules) {
            const added = await netRequestClient.addAsync(compiled.rule);
            if (added.hasErrors) {
                failures.push(failureOf(compiled, added.error));
                continue;
            }

            applied.push(compiled);
        }

        return applied;
    }
}
