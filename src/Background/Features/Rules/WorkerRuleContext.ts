import { RuleContextBase } from "../../../Common/Rules/Context/RuleContextBase";
import type { IVariableStore } from "./VariableStore";

type TypedVariableLookup = (name: string) => string | null;

export class WorkerRuleContext extends RuleContextBase {
    private readonly _variables: IVariableStore;
    private readonly _typedVariable: TypedVariableLookup;

    constructor(variables: IVariableStore, typedVariable: TypedVariableLookup) {
        super();
        this._variables = variables;
        this._typedVariable = typedVariable;
    }

    variable(name: string): string | null {
        return this._variables.get(name) ?? this._typedVariable(name);
    }

    setVariable(name: string, value: string): void {
        this._variables.set(name, value);
    }
}
