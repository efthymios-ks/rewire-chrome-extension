import { InMemoryRuleContext } from "../src/Common/Rules/Context/InMemoryRuleContext";

const DefaultRandom = 0.5;

export class FixedRuleContext extends InMemoryRuleContext {
    private readonly _now: Date;
    private readonly _random: number;

    constructor(now: Date, random: number = DefaultRandom) {
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
