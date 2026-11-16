import { RuleContextBase } from '../../../Common/Rules/Context/RuleContextBase';
import type { VariableStore } from './VariableStore';

type ProfileVariableLookup = (name: string) => string | null;

export class WorkerRuleContext extends RuleContextBase {
    private readonly _variables: VariableStore;
    private readonly _profileVariable: ProfileVariableLookup;

    constructor(variables: VariableStore, profileVariable: ProfileVariableLookup) {
        super();
        this._variables = variables;
        this._profileVariable = profileVariable;
    }

    variable(name: string): string | null {
        return this._variables.get(name) ?? this._profileVariable(name);
    }

    setVariable(name: string, value: string): void {
        this._variables.set(name, value);
    }
}
