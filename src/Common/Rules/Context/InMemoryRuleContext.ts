import { RuleContextBase } from "./RuleContextBase";

export class InMemoryRuleContext extends RuleContextBase {
    private readonly _variables: Map<string, string>;

    constructor(variables: Map<string, string> = new Map()) {
        super();
        this._variables = variables;
    }

    variable(name: string): string | null {
        return this._variables.get(name) ?? null;
    }

    setVariable(name: string, value: string): void {
        this._variables.set(name, value);
    }

    variables(): Map<string, string> {
        return new Map(this._variables);
    }
}
