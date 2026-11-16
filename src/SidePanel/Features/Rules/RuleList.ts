import { OwnEntry } from '../../../Common/Objects/OwnEntry';
import { ActiveProfile } from '../../../Common/Profiles/ActiveProfile';
import { RuleTypeRegistry } from '../../../Common/Rules/Types/RuleTypeRegistry';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { buildElement } from '../../Core/Dom/buildElement';
import { ConfirmDialog } from '../../Core/Dom/ConfirmDialog';
import { EmptyState } from '../../Core/Dom/EmptyState';
import { RenderScheduler } from '../../Core/Dom/RenderScheduler';
import { Equalities } from '../../Core/Equalities';
import type { PanelContext } from '../Shell/PanelContext';
import type { RuleFilter } from './RuleFilter';
import { RuleFilters } from './RuleFilters';
import { RuleRow } from './RuleRow';
import { RuleScopes } from './RuleScopes';

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
        this._list = buildElement('ol', {
            className: 'rule-list',
            attributes: {
                'aria-label': 'Rules, in the order they run',
            },
        });
        this._emptyState = EmptyState.build('No rules here yet. Add one, or use Mock this on a request.');
        this.root = buildElement('div', {
            className: 'rule-list-host',
            children: [
                this._list,
                this._emptyState,
            ],
        });

        context.store.select({
            selector: state => [
                ActiveProfile.rules(state.settings),
                state.ruleHits,
            ],
            listener: () => this._scheduler.schedule(),
            isEqual: Equalities.shallowArray,
        });
    }

    setFilter(filter: RuleFilter): void {
        this._filter = filter;
        this._scheduler.schedule();
    }

    private render(): void {
        const { settingsService, store, ruleEditor } = this._context;
        const state = store.getState();
        const rules = ActiveProfile.rules(state.settings);
        const visible = RuleFilters.apply(rules, this._filter);
        const indexOf = (rule: Rule): number => rules.findIndex(candidate => candidate.id === rule.id);

        this._list.replaceChildren(...visible.map(rule => RuleRow.build(
            /* model: */ {
                rule,
                plan: RuleScopes.planOf(rule),
                typeLabel: RuleTypeRegistry.get(rule.type)?.label ?? rule.type,
                hits: OwnEntry.of(state.ruleHits, rule.id) ?? 0,
            },
            /* actions: */ {
                onToggle: (target, isEnabled) => void settingsService.setRuleEnabledAsync(
                    /* ruleId: */ target.id,
                    /* isEnabled: */ isEnabled,
                ),
                onEdit: target => ruleEditor.open(target, false),
                onDuplicate: target => void settingsService.duplicateRuleAsync(target.id),
                onRemove: async target => {
                    const isConfirmed = await ConfirmDialog.askAsync({
                        title: 'Remove rule',
                        message: `Remove the rule "${target.name === '' ? target.type : target.name}"?`,
                        confirmText: 'Remove',
                    });
                    if (isConfirmed) {
                        await settingsService.removeRuleAsync(target.id);
                    }
                },
                onMove: (target, offset) => {
                    this._focusRuleId = target.id;
                    void settingsService.moveRuleAsync(target.id, indexOf(target) + offset);
                },
                onDrop: (draggedRuleId, target) => void settingsService.moveRuleAsync(
                    /* ruleId: */ draggedRuleId,
                    /* targetIndex: */ indexOf(target),
                ),
            },
        )));
        this._emptyState.hidden = visible.length > 0;
        this.restoreFocus();
    }

    private restoreFocus(): void {
        if (this._focusRuleId == null) {
            return;
        }

        const selector = `[data-rule-id="${CSS.escape(this._focusRuleId)}"] .drag-handle`;
        const row = this._list.querySelector<HTMLElement>(selector);
        this._focusRuleId = null;
        row?.focus();
    }
}
