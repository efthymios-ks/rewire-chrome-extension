import type { ILogger } from "../../../Common/Logging/ILogger";
import type { IRuleHitsClient } from "../../../Common/Storage/IRuleHitsClient";
import type { RuleHit } from "../../../Contracts/Rules/RuleHit";
import type { DnrRuleOwner } from "../NetworkRules/BrowserRuleCompiler";
import type { IDnrFeedbackClient } from "../NetworkRules/DnrFeedbackClient";

const PersistDelayInMilliseconds = 1000;
const PollIntervalInMilliseconds = 60_000;

export interface IRuleHitCounter {
    count(ruleId: string): void;
    setOwners(owners: DnrRuleOwner[]): void;
    startPolling(): void;
    stopPolling(): void;
}

export class RuleHitCounter implements IRuleHitCounter {
    private readonly _counts = new Map<string, number>();
    private readonly _owners = new Map<number, string>();
    private readonly _feedback: IDnrFeedbackClient;
    private readonly _hitsClient: IRuleHitsClient;
    private readonly _logger: ILogger;
    private _persistTimer: ReturnType<typeof setTimeout> | null = null;
    private _pollTimer: ReturnType<typeof setInterval> | null = null;
    private _lastPolledAt = Date.now();
    private _hasDebugFeedback = false;

    constructor(
        feedback: IDnrFeedbackClient,
        hitsClient: IRuleHitsClient,
        logger: ILogger
    ) {
        this._feedback = feedback;
        this._hitsClient = hitsClient;
        this._logger = logger;
    }

    async initialize(): Promise<void> {
        this._hasDebugFeedback = this._feedback.subscribeDebug(dnrRuleId => this.countBrowserRule(dnrRuleId));

        const stored = await this._hitsClient.load();
        if (stored.hasErrors) {
            this._logger.warn(stored.error);

            return;
        }

        stored.value.forEach(hit => this._counts.set(hit.ruleId, (this._counts.get(hit.ruleId) ?? 0) + hit.count));
    }

    count(ruleId: string): void {
        this._counts.set(ruleId, (this._counts.get(ruleId) ?? 0) + 1);
        this.schedulePersist();
    }

    setOwners(owners: DnrRuleOwner[]): void {
        this._owners.clear();
        owners.forEach(owner => this._owners.set(owner.dnrRuleId, owner.ruleId));
    }

    startPolling(): void {
        if (this._hasDebugFeedback || this._pollTimer !== null) {
            return;
        }

        this._pollTimer = setInterval(() => void this.poll(), PollIntervalInMilliseconds);
    }

    stopPolling(): void {
        if (this._pollTimer === null) {
            return;
        }

        clearInterval(this._pollTimer);
        this._pollTimer = null;
    }

    private countBrowserRule(dnrRuleId: number): void {
        const ruleId = this._owners.get(dnrRuleId);
        if (ruleId !== undefined) {
            this.count(ruleId);
        }
    }

    private async poll(): Promise<void> {
        const matched = await this._feedback.matchedSince(this._lastPolledAt);
        if (matched.hasErrors) {
            this._logger.warn("Reading browser rule matches failed.", matched.error);

            return;
        }

        matched.value.forEach(match => {
            this._lastPolledAt = Math.max(this._lastPolledAt, match.timeStamp + 1);
            this.countBrowserRule(match.dnrRuleId);
        });
    }

    private schedulePersist(): void {
        if (this._persistTimer !== null) {
            return;
        }

        this._persistTimer = setTimeout(
            () => {
                this._persistTimer = null;
                void this.persist();
            },
            PersistDelayInMilliseconds
        );
    }

    private async persist(): Promise<void> {
        const hits: RuleHit[] = [...this._counts.entries()].map(([ruleId, count]) => ({
            ruleId,
            count,
        }));
        const saved = await this._hitsClient.save(hits);
        if (saved.hasErrors) {
            this._logger.warn(saved.error);
        }
    }
}
