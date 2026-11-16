import { InMemoryRuleContext } from './Common/Rules/Context/InMemoryRuleContext';

const DEFAULT_RANDOM = 0.5;

export class FixedRuleContext extends InMemoryRuleContext {
    private readonly _now: Date;
    private readonly _random: number;

    constructor(now: Date, random: number = DEFAULT_RANDOM) {
        super();
        this._now = now;
        this._random = random;
    }

    override now(): Date {
        return this._now;
    }

    override random(): number {
        return this._random;
    }
}
