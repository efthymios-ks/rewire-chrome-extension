import { RuleTypeRegistry } from "../../../Common/Rules/Types/RuleTypeRegistry";
import type { Rule } from "../../../Contracts/Rules/Rule";
import { ConfirmDialog } from "../../Core/Dom/ConfirmDialog";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { EmptyState } from "../../Core/Dom/EmptyState";
import { RenderScheduler } from "../../Core/Dom/RenderScheduler";
import { Equalities } from "../../Core/Equalities";
import type { PanelContext } from "../Shell/PanelContext";
import { type RuleFilter, RuleFilters } from "./RuleFilter";
import { RuleRow } from "./RuleRow";
import { RuleScopes } from "./RuleScopes";

export class RuleList {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _list: HTMLOListElement;
    private readonly _emptyState: HTMLElement;
    private readonly _scheduler = new RenderScheduler(() => this.render());
    private _filter: RuleFilter;
    private _focusRuleId: string | null = null;

    constructor(context: PanelContext, filter: RuleFilter) {
        this._context = context;
        this._filter = filter;
        this._list = buildElement("ol", {
            className: "rule-list",
            attributes: {
                "aria-label": "Rules, in the order they run",
            },
        });
        this._emptyState = EmptyState.build("No rules here yet. Add one, or use Mock this on a request.");
        this.root = buildElement("div", {
            className: "rule-list-host",
            children: [
                this._list,
                this._emptyState,
            ],
        });

        context.store.select(
            state => [
                state.settings.rules,
                state.ruleHits,
            ],
            () => this._scheduler.schedule(),
            Equalities.shallowArray
        );
    }

    setFilter(filter: RuleFilter): void {
        this._filter = filter;
        this._scheduler.schedule();
    }

    private render(): void {
        const { settingsService, store, ruleEditor } = this._context;
        const state = store.getState();
        const settings = state.settings;
        const visible = RuleFilters.apply(settings.rules, this._filter);
        const indexOf = (rule: Rule): number => settings.rules.findIndex(candidate => candidate.id === rule.id);

        this._list.replaceChildren(...visible.map(rule => RuleRow.build(
            {
                rule,
                plan: RuleScopes.planOf(rule),
                typeLabel: RuleTypeRegistry.get(rule.type)?.label ?? rule.type,
                hits: state.ruleHits[rule.id] ?? 0,
            },
            {
                onToggle: (target, enabled) => void settingsService.setRuleEnabled(target.id, enabled),
                onEdit: target => ruleEditor.open(target, false),
                onDuplicate: target => void settingsService.duplicateRule(target.id),
                onRemove: target => void ConfirmDialog
                    .ask({
                        title: "Remove rule",
                        message: `Remove the rule "${target.name || target.type}"?`,
                        confirmText: "Remove",
                    })
                    .then(confirmed => confirmed ? settingsService.removeRule(target.id) : undefined),
                onMove: (target, offset) => {
                    this._focusRuleId = target.id;
                    void settingsService.moveRule(target.id, indexOf(target) + offset);
                },
                onDrop: (draggedRuleId, target) => void settingsService.moveRule(draggedRuleId, indexOf(target)),
            }
        )));
        this._emptyState.hidden = visible.length > 0;
        this.restoreFocus();
    }

    private restoreFocus(): void {
        if (this._focusRuleId === null) {
            return;
        }

        const row = this._list.querySelector<HTMLElement>(`[data-rule-id="${CSS.escape(this._focusRuleId)}"] .drag-handle`);
        this._focusRuleId = null;
        row?.focus();
    }
}
