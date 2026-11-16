import type { Logger } from '../../../Common/Logging/Logger';
import type { RuleHitsClient } from '../../../Common/Storage/RuleHitsClient';
import type { RuleHit } from '../../../Contracts/Rules/RuleHit';
import type { DnrFeedbackClient } from '../NetworkRules/DnrFeedbackClient';
import type { DnrRuleOwner } from '../NetworkRules/DnrRuleOwner';
import type { RuleHitCounter } from './RuleHitCounter';

const PERSIST_DELAY_IN_MILLISECONDS = 1000;
const POLL_INTERVAL_IN_MILLISECONDS = 60_000;

export interface DefaultRuleHitCounterDependencies {
    feedback: DnrFeedbackClient;
    hitsClient: RuleHitsClient;
    logger: Logger;
}

export class DefaultRuleHitCounter implements RuleHitCounter {
    private readonly _counts = new Map<string, number>();
    private readonly _owners = new Map<number, string>();
    private readonly _feedback: DnrFeedbackClient;
    private readonly _hitsClient: RuleHitsClient;
    private readonly _logger: Logger;
    private _persistTimer: ReturnType<typeof setTimeout> | null = null;
    private _pollTimer: ReturnType<typeof setInterval> | null = null;
    private _lastPolledAt = Date.now();
    private _hasDebugFeedback = false;

    constructor({ feedback, hitsClient, logger }: DefaultRuleHitCounterDependencies) {
        this._feedback = feedback;
        this._hitsClient = hitsClient;
        this._logger = logger;
    }

    async initializeAsync(): Promise<void> {
        this._hasDebugFeedback = this._feedback.subscribeDebug(dnrRuleId => this.countBrowserRule(dnrRuleId));

        const stored = await this._hitsClient.loadAsync();
        if (stored.hasErrors) {
            this._logger.warn(stored.error);

            return;
        }

        stored.value.forEach(hit => this.add(hit.ruleId, hit.count));
    }

    count(ruleId: string): void {
        this.add(ruleId, 1);
        this.schedulePersist();
    }

    setOwners(owners: DnrRuleOwner[]): void {
        this._owners.clear();
        owners.forEach(owner => this._owners.set(owner.dnrRuleId, owner.ruleId));
    }

    startPolling(): void {
        if (this._hasDebugFeedback || this._pollTimer != null) {
            return;
        }

        this._pollTimer = setInterval(() => void this.pollAsync(), POLL_INTERVAL_IN_MILLISECONDS);
    }

    stopPolling(): void {
        if (this._pollTimer == null) {
            return;
        }

        clearInterval(this._pollTimer);
        this._pollTimer = null;
    }

    private add(ruleId: string, hits: number): void {
        this._counts.set(ruleId, (this._counts.get(ruleId) ?? 0) + hits);
    }

    private countBrowserRule(dnrRuleId: number): void {
        const ruleId = this._owners.get(dnrRuleId);
        if (ruleId != null) {
            this.count(ruleId);
        }
    }

    private async pollAsync(): Promise<void> {
        const matched = await this._feedback.matchedSinceAsync(this._lastPolledAt);
        if (matched.hasErrors) {
            this._logger.warn('Reading browser rule matches failed.', matched.error);

            return;
        }

        matched.value.forEach(match => {
            this._lastPolledAt = Math.max(this._lastPolledAt, match.timeStamp + 1);
            this.countBrowserRule(match.dnrRuleId);
        });
    }

    private schedulePersist(): void {
        if (this._persistTimer != null) {
            return;
        }

        this._persistTimer = setTimeout(
            /* callback: */ () => {
                this._persistTimer = null;
                void this.persistAsync();
            },
            /* delay: */ PERSIST_DELAY_IN_MILLISECONDS,
        );
    }

    private async persistAsync(): Promise<void> {
        const hits: RuleHit[] = [...this._counts.entries()].map(([ruleId, count]) => ({
            ruleId,
            count,
        }));
        const saved = await this._hitsClient.saveAsync(hits);
        if (saved.hasErrors) {
            this._logger.warn(saved.error);
        }
    }
}
