import { RuleContextBase } from "../../../Common/Rules/Context/RuleContextBase";
import type { IVariableStore } from "./VariableStore";

export class WorkerRuleContext extends RuleContextBase {
    private readonly _variables: IVariableStore;

    constructor(variables: IVariableStore) {
        super();
        this._variables = variables;
    }

    variable(name: string): string | null {
        return this._variables.get(name);
    }

    setVariable(name: string, value: string): void {
        this._variables.set(name, value);
    }
}
