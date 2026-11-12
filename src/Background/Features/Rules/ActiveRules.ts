import { ActiveProfile } from "../../../Common/Profiles/ActiveProfile";
import { ProfileVariables } from "../../../Common/Profiles/ProfileVariables";
import { InMemoryRuleContext } from "../../../Common/Rules/Context/InMemoryRuleContext";
import type { RuleContext } from "../../../Common/Rules/Context/RuleContext";
import { RuleEnginePlanner } from "../../../Common/Rules/Engine/RuleEnginePlanner";
import { type PipelineEntry, PipelineEntries } from "../../../Common/Rules/Engine/RulePipeline";
import type { RulePlan } from "../../../Common/Rules/Engine/RulePlan";
import type { ProfileVariable } from "../../../Contracts/Settings/ProfileVariable";
import type { ISettingsCache } from "../Settings/ISettingsCache";
import type { IVariableStore } from "./VariableStore";
import { WorkerRuleContext } from "./WorkerRuleContext";

const VariableMarker = "{{";

export interface IActiveRules {
    isEnabled(): boolean;
    plans(): RulePlan[];
    context(): RuleContext;
    simulationContext(): RuleContext;
    debuggerEntries(): PipelineEntry[];
    browserEntries(): PipelineEntry[];
    wholeEntries(): PipelineEntry[];
    subscribe(listener: () => void): void;
}

export class ActiveRules implements IActiveRules {
    private readonly _settingsCache: ISettingsCache;
    private readonly _variables: IVariableStore;
    private readonly _listeners: Array<() => void> = [];
    private readonly _context: WorkerRuleContext;
    private _plans: RulePlan[] = [];

    constructor(settingsCache: ISettingsCache, variables: IVariableStore) {
        this._settingsCache = settingsCache;
        this._variables = variables;
        this._context = new WorkerRuleContext(variables, name => ProfileVariables.valueOf(this.typedVariables(), name));

        variables.subscribe(() => {
            if (JSON.stringify(ActiveProfile.rules(this._settingsCache.current())).includes(VariableMarker)) {
                this.refresh();
            }
        });
    }

    refresh(): void {
        const rules = ActiveProfile
            .rules(this._settingsCache.current())
            .filter(rule => rule.enabled);
        this._plans = RuleEnginePlanner.planAll(rules, this._context);
        this._listeners.forEach(listener => listener());
    }

    isEnabled(): boolean {
        return this._settingsCache.current().interceptionEnabled;
    }

    plans(): RulePlan[] {
        return this._plans;
    }

    context(): RuleContext {
        return this._context;
    }

    simulationContext(): RuleContext {
        return new InMemoryRuleContext(new Map([
            ...ProfileVariables.mapOf(this.typedVariables()),
            ...this._variables.snapshot(),
        ]));
    }

    debuggerEntries(): PipelineEntry[] {
        return this.isEnabled() ? PipelineEntries.forDebugger(this._plans) : [];
    }

    wholeEntries(): PipelineEntry[] {
        return this.isEnabled() ? PipelineEntries.forWholeRules(this._plans) : [];
    }

    browserEntries(): PipelineEntry[] {
        return this.isEnabled() ? PipelineEntries.forBrowser(this._plans) : [];
    }

    subscribe(listener: () => void): void {
        this._listeners.push(listener);
    }

    private typedVariables(): ProfileVariable[] {
        return ActiveProfile.variables(this._settingsCache.current());
    }
}
