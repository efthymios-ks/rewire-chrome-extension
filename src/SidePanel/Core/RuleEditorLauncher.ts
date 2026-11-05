import type { Rule } from "../../Contracts/Rules/Rule";
import type { PanelState } from "./PanelState";
import type { Store } from "./Store";
import { ViewId } from "./ViewId";

export class RuleEditorLauncher {
    private readonly _store: Store<PanelState>;

    constructor(store: Store<PanelState>) {
        this._store = store;
    }

    open(rule: Rule, isNew: boolean): void {
        this._store.update(state => ({
            ...state,
            activeView: ViewId.Rules,
            ruleEditRequest: {
                rule,
                isNew,
                requestedAt: Date.now(),
            },
        }));
    }

    close(): void {
        this._store.update(state => state.ruleEditRequest === null
            ? state
            : {
                ...state,
                ruleEditRequest: null,
            });
    }
}
