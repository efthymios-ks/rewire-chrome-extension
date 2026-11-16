import type { Criterion } from '../../../Contracts/Rules/Criterion';
import type { RuleContext } from './RuleContext';

// Replaying each Sample roll keeps one test run from contradicting itself.
export class RollOnceRuleContext implements RuleContext {
    private readonly _inner: RuleContext;
    private readonly _rolls = new Map<Criterion, number>();

    constructor(inner: RuleContext) {
        this._inner = inner;
    }

    now(): Date {
        return this._inner.now();
    }

    random(): number {
        return this._inner.random();
    }

    sampleRoll(criterion: Criterion): number {
        const rolled = this._rolls.get(criterion);
        if (rolled != null) {
            return rolled;
        }

        const roll = this._inner.sampleRoll(criterion);
        this._rolls.set(criterion, roll);

        return roll;
    }

    variable(name: string): string | null {
        return this._inner.variable(name);
    }

    setVariable(name: string, value: string): void {
        this._inner.setVariable(name, value);
    }

    render(text: string): string {
        return this._inner.render(text);
    }
}
