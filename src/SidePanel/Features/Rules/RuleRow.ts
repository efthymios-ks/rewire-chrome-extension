import type { RulePlan } from '../../../Common/Rules/Engine/RulePlan';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import { RuleScopes } from './RuleScopes';
import { SCOPE_APPEARANCES } from './ScopeAppearance';

const DRAG_HANDLE_GLYPH = '⠿';
const MOVE_KEYS: Record<string, number> = Object.freeze({
    ArrowUp: -1,
    ArrowDown: 1,
});

export interface RuleRowActions {
    onToggle(rule: Rule, isEnabled: boolean): void;
    onEdit(rule: Rule): void;
    onDuplicate(rule: Rule): void;
    onRemove(rule: Rule): void;
    onMove(rule: Rule, offset: number): void;
    onDrop(draggedRuleId: string, target: Rule): void;
}

export interface RuleRowModel {
    rule: Rule;
    plan: RulePlan;
    typeLabel: string;
    hits: number;
}

const DRAG_DATA_TYPE = 'text/plain';

export const RuleRow = {
    build(model: RuleRowModel, actions: RuleRowActions): HTMLLIElement {
        const { rule, plan } = model;
        const appearance = SCOPE_APPEARANCES[plan.engine];
        const handle = buildElement('button', {
            className: 'drag-handle',
            text: DRAG_HANDLE_GLYPH,
            title: 'Drag, or focus and press the arrow keys, to reorder',
            attributes: {
                type: 'button',
                'aria-label': `Reorder ${rule.name}`,
            },
            listeners: {
                keydown: event => {
                    const offset = MOVE_KEYS[event.key];
                    if (offset == null) {
                        return;
                    }

                    event.preventDefault();
                    actions.onMove(rule, offset);
                },
            },
        });

        const row = buildElement('li', {
            className: 'rule-row',
            attributes: {
                draggable: 'true',
                'data-rule-id': rule.id,
                ...(rule.enabled ? {} : { 'data-disabled': '' }),
            },
            listeners: {
                dragstart: event => {
                    event.dataTransfer?.setData(DRAG_DATA_TYPE, rule.id);
                    row.toggleAttribute('data-dragging', true);
                },
                dragend: () => row.toggleAttribute('data-dragging', false),
                dragover: event => {
                    event.preventDefault();
                    row.toggleAttribute('data-drop-target', true);
                },
                dragleave: () => row.toggleAttribute('data-drop-target', false),
                drop: event => {
                    event.preventDefault();
                    row.toggleAttribute('data-drop-target', false);
                    const draggedRuleId = event.dataTransfer?.getData(DRAG_DATA_TYPE) ?? '';
                    if (draggedRuleId !== '' && draggedRuleId !== rule.id) {
                        actions.onDrop(draggedRuleId, rule);
                    }
                },
            },
            children: [
                handle,
                FormControls.toggleSwitch({
                    checked: rule.enabled,
                    label: '',
                    onChange: isEnabled => actions.onToggle(rule, isEnabled),
                }),
                buildElement('div', {
                    className: 'rule-main',
                    children: [
                        buildElement('div', {
                            className: 'rule-title',
                            children: [
                                buildElement('span', {
                                    className: 'rule-name',
                                    text: rule.name === '' ? model.typeLabel : rule.name,
                                }),
                                buildElement('span', {
                                    className: 'type-badge',
                                    text: model.typeLabel,
                                }),
                                buildElement('span', {
                                    className: `scope-badge ${appearance.className}`,
                                    text: appearance.label,
                                    title: [
                                        plan.reason,
                                        ...plan.errors,
                                    ].join('\n'),
                                }),
                                buildElement('span', {
                                    className: 'hit-count',
                                    text: String(model.hits),
                                    title: `${model.hits} hits since the browser started`,
                                }),
                            ],
                        }),
                        buildElement('div', {
                            className: 'rule-target',
                            text: RuleScopes.criteriaSummary(rule),
                            title: RuleScopes.criteriaSummary(rule),
                        }),
                    ],
                }),
                buildElement('div', {
                    className: 'row-actions',
                    children: [
                        FormControls.button({
                            text: 'Edit',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => actions.onEdit(rule),
                        }),
                        FormControls.button({
                            text: 'Duplicate',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => actions.onDuplicate(rule),
                        }),
                        FormControls.button({
                            text: 'Remove',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => actions.onRemove(rule),
                        }),
                    ],
                }),
            ],
        });
        row.querySelector('.switch input')?.setAttribute('aria-label', `Enable ${rule.name}`);

        return row;
    },
};
