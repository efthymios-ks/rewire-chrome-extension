import { afterEach, describe, expect, test, vi } from 'vitest';
import { PLANNER_REASONS } from '../../../../Common/Rules/Engine/PlannerReasons';
import { OPERATION_KINDS } from '../../../../Common/Rules/Types/OperationKinds';
import { RuleTypeRegistry } from '../../../../Common/Rules/Types/RuleTypeRegistry';
import type { Rule } from '../../../../Contracts/Rules/Rule';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { DEFAULT_PANEL_SETTINGS } from '../../../../Contracts/Settings/DefaultPanelSettings';
import { PANEL_LIMITS } from '../../../Core/PanelLimits';
import { RuleEditor } from './RuleEditor';
import { aRule } from '../../../../TestData';
import { aFileClient, aPanelHarness, buttonNamed, click, controlNamed, typeInto } from '../../../PanelTestData';

const COOKIE_TYPE = RuleTypeRegistry.get(RULE_TYPE_IDS.RequestCookie)!;

function aCookieRule(overrides: Partial<Rule> = {}): Rule {
    return aRule({
        id: 'cookie-rule',
        name: 'Theme cookie',
        type: RULE_TYPE_IDS.RequestCookie,
        action: {
            op: OPERATION_KINDS.AddOrUpdate,
            name: 'theme',
            value: 'dark',
        },
        ...overrides,
    });
}

function anEditor(rule: Rule) {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const editor = new RuleEditor({
        context: aPanelHarness().context,
        fileClient: aFileClient(),
        type: COOKIE_TYPE,
        rule,
        onSave,
        onCancel,
    });

    return {
        editor,
        onSave,
        onCancel,
    };
}

function enabledSwitchOf(editor: RuleEditor): HTMLInputElement {
    return editor.root.querySelector<HTMLInputElement>('.switch input')!;
}

function errorsOf(editor: RuleEditor): HTMLElement {
    return editor.root.querySelector<HTMLElement>('ul.form-error')!;
}

function scopeOf(editor: RuleEditor): HTMLElement {
    return editor.root.querySelector<HTMLElement>('.editor-scope')!;
}

describe('RuleEditor', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('constructor_WhenGivenAValidRule_ShouldFillTheFormAndExplainTheScope', () => {
        // Arrange
        const rule = aCookieRule();

        // Act
        const { editor } = anEditor(rule);

        // Assert
        expect(editor.root.querySelector('.rule-description')?.textContent).toBe(COOKIE_TYPE.description);
        expect(controlNamed<HTMLInputElement>(editor.root, 'Name').value).toBe('Theme cookie');
        expect(controlNamed<HTMLInputElement>(editor.root, 'Name').placeholder).toBe(COOKIE_TYPE.label);
        expect(controlNamed<HTMLInputElement>(editor.root, 'Cookie name').value).toBe('theme');
        expect(enabledSwitchOf(editor).checked).toBe(true);
        const sectionTitles = [...editor.root.querySelectorAll('.editor-section-title')]
            .map(title => title.textContent);
        expect(sectionTitles).toEqual([
            'If',
            'Then',
            'Test this rule',
        ]);
        expect(scopeOf(editor).querySelector('.scope-badge')?.textContent).toBe('Inspected tab');
        expect(scopeOf(editor).textContent).toBe(`Inspected tab ${PLANNER_REASONS.TypeNeedsDebugger}`);
        expect(errorsOf(editor).hidden).toBe(true);
        expect(editor.root.querySelector<HTMLInputElement>('.tester-form input')?.value)
            .toBe(DEFAULT_PANEL_SETTINGS.testerSamples[0]);
    });

    test('constructor_WhenTheActionIsInvalid_ShouldListWhatToFix', () => {
        // Arrange
        const rule = aCookieRule({
            action: {
                op: OPERATION_KINDS.AddOrUpdate,
                name: '',
                value: 'dark',
            },
        });

        // Act
        const { editor } = anEditor(rule);

        // Assert
        expect(errorsOf(editor).hidden).toBe(false);
        expect([...errorsOf(editor).querySelectorAll('li')].map(error => error.textContent)).toEqual([
            'Cookie name is required.',
        ]);
        expect(scopeOf(editor).textContent).toBe('Invalid');
        expect(scopeOf(editor).querySelector('.scope-invalid')).not.toBeNull();
    });

    test('action_WhenTheMissingValueIsFilled_ShouldClearTheErrors', () => {
        // Arrange
        const { editor } = anEditor(aCookieRule({
            action: {
                op: OPERATION_KINDS.AddOrUpdate,
                name: '',
                value: 'dark',
            },
        }));

        // Act
        typeInto(controlNamed(editor.root, 'Cookie name'), 'theme');

        // Assert
        expect(errorsOf(editor).hidden).toBe(true);
        expect(errorsOf(editor).childElementCount).toBe(0);
        expect(scopeOf(editor).querySelector('.scope-badge')?.textContent).toBe('Inspected tab');
    });

    test('constructor_WhenTheRuleIsDisabled_ShouldStillExplainWhereItWouldRun', () => {
        // Arrange
        const rule = aCookieRule({
            enabled: false,
        });

        // Act
        const { editor } = anEditor(rule);

        // Assert
        expect(enabledSwitchOf(editor).checked).toBe(false);
        expect(scopeOf(editor).textContent).toBe(`Inspected tab ${PLANNER_REASONS.TypeNeedsDebugger}`);
    });

    test('save_WhenFieldsAreEdited_ShouldPassTheEditedRule', () => {
        // Arrange
        const rule = aCookieRule();
        const { editor, onSave } = anEditor(rule);
        typeInto(controlNamed(editor.root, 'Name'), 'Light theme');
        typeInto(controlNamed(editor.root, 'Value'), 'light');
        const enabled = enabledSwitchOf(editor);
        enabled.checked = false;
        enabled.dispatchEvent(new Event('change'));

        // Act
        click(buttonNamed(editor.root, 'Save rule'));

        // Assert
        expect(onSave).toHaveBeenCalledWith(aCookieRule({
            name: 'Light theme',
            enabled: false,
            action: {
                op: OPERATION_KINDS.AddOrUpdate,
                name: 'theme',
                value: 'light',
            },
        }));
        expect(rule).toEqual(aCookieRule());
    });

    test('save_WhenTheCriteriaAreEdited_ShouldPassTheNewCriteria', () => {
        // Arrange
        const { editor, onSave } = anEditor(aCookieRule());

        // Act
        typeInto(editor.root.querySelector<HTMLInputElement>('.criterion-value')!, '*/api/v2/*');
        click(buttonNamed(editor.root, 'Save rule'));

        // Assert
        const saved = onSave.mock.calls[0]?.[0] as Rule;
        expect(saved.criteria.items[0]?.value).toBe('*/api/v2/*');
    });

    test('save_WhenClickedTwice_ShouldPassIndependentCopies', () => {
        // Arrange
        const { editor, onSave } = anEditor(aCookieRule());
        click(buttonNamed(editor.root, 'Save rule'));

        // Act
        click(buttonNamed(editor.root, 'Save rule'));

        // Assert
        expect(onSave.mock.calls[0]?.[0]).toEqual(onSave.mock.calls[1]?.[0]);
        expect(onSave.mock.calls[0]?.[0]).not.toBe(onSave.mock.calls[1]?.[0]);
    });

    test('save_WhenTheRuleIsInvalid_ShouldStillSaveItSoItCanBeFixedLater', () => {
        // Arrange
        const { editor, onSave } = anEditor(aCookieRule());
        typeInto(controlNamed(editor.root, 'Cookie name'), '');

        // Act
        click(buttonNamed(editor.root, 'Save rule'));

        // Assert
        expect(errorsOf(editor).hidden).toBe(false);
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    test('cancel_WhenClicked_ShouldCallOnCancelWithoutSaving', () => {
        // Arrange
        const { editor, onSave, onCancel } = anEditor(aCookieRule());

        // Act
        click(buttonNamed(editor.root, 'Cancel'));

        // Assert
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onSave).not.toHaveBeenCalled();
    });

    test('tester_WhenTheRuleIsEdited_ShouldRetestWithTheDraft', () => {
        // Arrange
        vi.useFakeTimers();
        const { editor } = anEditor(aCookieRule());

        // Act
        typeInto(controlNamed(editor.root, 'Name'), 'Renamed cookie');
        vi.advanceTimersByTime(PANEL_LIMITS.TesterDebounceInMilliseconds);

        // Assert
        expect(editor.root.querySelector('.tester-step strong')?.textContent).toBe('Renamed cookie');
        expect(editor.root.querySelector('.tester-step .change-line')?.textContent)
            .toBe('Request header cookie: (none) → theme=dark');
    });
});
