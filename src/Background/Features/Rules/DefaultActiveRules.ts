import { ActiveProfile } from '../../../Common/Profiles/ActiveProfile';
import { ProfileVariables } from '../../../Common/Profiles/ProfileVariables';
import { InMemoryRuleContext } from '../../../Common/Rules/Context/InMemoryRuleContext';
import type { RuleContext } from '../../../Common/Rules/Context/RuleContext';
import { PipelineEntries } from '../../../Common/Rules/Engine/PipelineEntries';
import type { PipelineEntry } from '../../../Common/Rules/Engine/PipelineEntry';
import { RuleEnginePlanner } from '../../../Common/Rules/Engine/RuleEnginePlanner';
import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';
import type { ProfileVariable } from '../../../Contracts/Settings/ProfileVariable';
import type { SettingsCache } from '../Settings/SettingsCache';
import type { ActiveRules } from './ActiveRules';
import type { VariableStore } from './VariableStore';
import { WorkerRuleContext } from './WorkerRuleContext';

const VARIABLE_MARKER = '{{';

export class DefaultActiveRules implements ActiveRules {
    private readonly _settingsCache: SettingsCache;
    private readonly _variables: VariableStore;
    private readonly _listeners: Array<() => void> = [];
    private readonly _context: WorkerRuleContext;
    private _plans: RulePlan[] = [];

    constructor(settingsCache: SettingsCache, variables: VariableStore) {
        this._settingsCache = settingsCache;
        this._variables = variables;
        this._context = new WorkerRuleContext(variables, name => ProfileVariables.valueOf(
            /* variables: */ this.profileVariables(),
            /* name: */ name,
        ));

        variables.subscribe(() => {
            const rulesJson = JSON.stringify(ActiveProfile.rules(this._settingsCache.current()));
            if (rulesJson.includes(VARIABLE_MARKER)) {
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
            ...ProfileVariables.mapOf(this.profileVariables()),
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

    private profileVariables(): ProfileVariable[] {
        return ActiveProfile.variables(this._settingsCache.current());
    }
}
