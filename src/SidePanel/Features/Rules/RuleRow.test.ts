import { describe, expect, test, vi } from 'vitest';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { RuleRow, type RuleRowActions } from './RuleRow';
import { RuleScopes } from './RuleScopes';
import { aRule } from '../../../TestData';
import { buttonNamed, click } from '../../PanelTestData';

const DRAG_DATA_TYPE = 'text/plain';

function anActions(): RuleRowActions {
    return {
        onToggle: vi.fn(),
        onEdit: vi.fn(),
        onDuplicate: vi.fn(),
        onRemove: vi.fn(),
        onMove: vi.fn(),
        onDrop: vi.fn(),
    };
}

interface ARowOptions {
    rule: Rule;
    actions?: RuleRowActions;
    hits?: number;
}

function aRow({ rule, actions = anActions(), hits = 0 }: ARowOptions): HTMLLIElement {
    return RuleRow.build(
        /* model: */ {
            rule,
            plan: RuleScopes.planOf(rule),
            typeLabel: 'Mock response',
            hits,
        },
        /* actions: */ actions,
    );
}

function aDragEvent(type: string, data: Record<string, string> = {}): Event {
    const event = new Event(type, {
        bubbles: true,
        cancelable: true,
    });
    const store = new Map(Object.entries(data));
    Object.defineProperty(event, 'dataTransfer', {
        value: {
            setData: (format: string, value: string) => store.set(format, value),
            getData: (format: string) => store.get(format) ?? '',
        },
    });

    return event;
}

function handleOf(row: HTMLElement): HTMLButtonElement {
    return row.querySelector<HTMLButtonElement>('.drag-handle')!;
}

describe('RuleRow', () => {
    test('build_WhenGivenARule_ShouldShowItsNameTypeScopeHitsAndCriteria', () => {
        // Arrange
        const rule = aRule();

        // Act
        const row = aRow({ rule, hits: 7 });

        // Assert
        expect(row.dataset['ruleId']).toBe('rule-1');
        expect(row.getAttribute('draggable')).toBe('true');
        expect(row.hasAttribute('data-disabled')).toBe(false);
        expect(row.querySelector('.rule-name')?.textContent).toBe('Users mock');
        expect(row.querySelector('.type-badge')?.textContent).toBe('Mock response');
        expect(row.querySelector('.hit-count')?.textContent).toBe('7');
        expect(row.querySelector('.hit-count')?.getAttribute('title'))
            .toBe('7 hits since the browser started');
        expect(row.querySelector('.rule-target')?.textContent).toBe(RuleScopes.criteriaSummary(rule));
        expect(handleOf(row).getAttribute('aria-label')).toBe('Reorder Users mock');
        expect(row.querySelector('.switch input')?.getAttribute('aria-label')).toBe('Enable Users mock');
        expect(row.querySelector<HTMLInputElement>('.switch input')?.checked).toBe(true);
    });

    test('build_WhenThePlanIsValid_ShouldLabelTheScopeAndExplainIt', () => {
        // Arrange
        const rule = aRule();
        const plan = RuleScopes.planOf(rule);

        // Act
        const row = aRow({ rule });

        // Assert
        const badge = row.querySelector('.scope-badge')!;
        expect(plan.engine).not.toBe(RULE_ENGINE.Invalid);
        expect(badge.textContent).not.toBe('Invalid');
        expect(badge.getAttribute('title')).toBe(plan.reason);
    });

    test('build_WhenThePlanIsInvalid_ShouldLabelItInvalidAndListTheErrors', () => {
        // Arrange
        const rule = aRule({
            type: 'graphqlMock',
        });
        const plan = RuleScopes.planOf(rule);

        // Act
        const row = aRow({ rule });

        // Assert
        const badge = row.querySelector('.scope-badge')!;
        expect(plan.engine).toBe(RULE_ENGINE.Invalid);
        expect(badge.textContent).toBe('Invalid');
        expect(badge.classList.contains('scope-invalid')).toBe(true);
        expect(badge.getAttribute('title')).toBe([
            plan.reason,
            ...plan.errors,
        ].join('\n'));
    });

    test('build_WhenTheRuleIsDisabled_ShouldMarkTheRowAndUncheckTheSwitch', () => {
        // Arrange
        const rule = aRule({
            enabled: false,
        });

        // Act
        const row = aRow({ rule });

        // Assert
        expect(row.hasAttribute('data-disabled')).toBe(true);
        expect(row.querySelector<HTMLInputElement>('.switch input')?.checked).toBe(false);
    });

    test('build_WhenTheRuleHasNoName_ShouldFallBackToTheTypeLabel', () => {
        // Arrange
        const rule = aRule({
            name: '',
        });

        // Act
        const row = aRow({ rule });

        // Assert
        expect(row.querySelector('.rule-name')?.textContent).toBe('Mock response');
    });

    test('switch_WhenToggled_ShouldReportTheNewState', () => {
        // Arrange
        const actions = anActions();
        const rule = aRule();
        const row = aRow({ rule, actions });
        const toggle = row.querySelector<HTMLInputElement>('.switch input')!;

        // Act
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));

        // Assert
        expect(actions.onToggle).toHaveBeenCalledWith(rule, false);
    });

    test.each([
        [
            'Edit',
            'onEdit',
        ],
        [
            'Duplicate',
            'onDuplicate',
        ],
        [
            'Remove',
            'onRemove',
        ],
    ] as const)('button_When(%s)IsClicked_ShouldCall(%s)', (text, action) => {
        // Arrange
        const actions = anActions();
        const rule = aRule();
        const row = aRow({ rule, actions });

        // Act
        click(buttonNamed(row, text));

        // Assert
        expect(actions[action]).toHaveBeenCalledWith(rule);
    });

    test.each([
        [
            'ArrowUp',
            -1,
        ],
        [
            'ArrowDown',
            1,
        ],
    ])('keydown_When(%s)IsPressed_ShouldMoveBy(%s)', (key, offset) => {
        // Arrange
        const actions = anActions();
        const rule = aRule();
        const row = aRow({ rule, actions });
        const keydown = new KeyboardEvent('keydown', {
            key,
            cancelable: true,
        });

        // Act
        handleOf(row).dispatchEvent(keydown);

        // Assert
        expect(actions.onMove).toHaveBeenCalledWith(rule, offset);
        expect(keydown.defaultPrevented).toBe(true);
    });

    test('keydown_WhenAnotherKeyIsPressed_ShouldNotMove', () => {
        // Arrange
        const actions = anActions();
        const row = aRow({ rule: aRule(), actions });
        const keydown = new KeyboardEvent('keydown', {
            key: 'Enter',
            cancelable: true,
        });

        // Act
        handleOf(row).dispatchEvent(keydown);

        // Assert
        expect(actions.onMove).not.toHaveBeenCalled();
        expect(keydown.defaultPrevented).toBe(false);
    });

    test('dragstart_WhenTheRowIsDragged_ShouldCarryTheRuleIdAndMarkIt', () => {
        // Arrange
        const row = aRow({ rule: aRule() });
        const dragstart = aDragEvent('dragstart');

        // Act
        row.dispatchEvent(dragstart);

        // Assert
        expect((dragstart as DragEvent).dataTransfer?.getData(DRAG_DATA_TYPE)).toBe('rule-1');
        expect(row.hasAttribute('data-dragging')).toBe(true);
    });

    test('dragend_WhenTheDragEnds_ShouldUnmarkTheRow', () => {
        // Arrange
        const row = aRow({ rule: aRule() });
        row.dispatchEvent(aDragEvent('dragstart'));

        // Act
        row.dispatchEvent(aDragEvent('dragend'));

        // Assert
        expect(row.hasAttribute('data-dragging')).toBe(false);
    });

    test('dragover_WhenARowIsHeldOverIt_ShouldMarkItAsTheDropTarget', () => {
        // Arrange
        const row = aRow({ rule: aRule() });
        const dragover = aDragEvent('dragover');

        // Act
        row.dispatchEvent(dragover);

        // Assert
        expect(row.hasAttribute('data-drop-target')).toBe(true);
        expect(dragover.defaultPrevented).toBe(true);
    });

    test('dragleave_WhenTheDragMovesAway_ShouldUnmarkTheDropTarget', () => {
        // Arrange
        const row = aRow({ rule: aRule() });
        row.dispatchEvent(aDragEvent('dragover'));

        // Act
        row.dispatchEvent(aDragEvent('dragleave'));

        // Assert
        expect(row.hasAttribute('data-drop-target')).toBe(false);
    });

    test('drop_WhenAnotherRuleIsDropped_ShouldReportTheMove', () => {
        // Arrange
        const actions = anActions();
        const rule = aRule();
        const row = aRow({ rule, actions });
        row.dispatchEvent(aDragEvent('dragover'));

        // Act
        row.dispatchEvent(aDragEvent('drop', {
            [DRAG_DATA_TYPE]: 'rule-2',
        }));

        // Assert
        expect(actions.onDrop).toHaveBeenCalledWith('rule-2', rule);
        expect(row.hasAttribute('data-drop-target')).toBe(false);
    });

    test.each([
        [
            'itself',
            'rule-1',
        ],
        [
            'nothing',
            '',
        ],
    ])('drop_WhenTheDraggedRuleIs(%s)_ShouldIgnoreIt', (_, draggedRuleId) => {
        // Arrange
        const actions = anActions();
        const row = aRow({ rule: aRule(), actions });

        // Act
        row.dispatchEvent(aDragEvent('drop', {
            [DRAG_DATA_TYPE]: draggedRuleId,
        }));

        // Assert
        expect(actions.onDrop).not.toHaveBeenCalled();
    });
});
