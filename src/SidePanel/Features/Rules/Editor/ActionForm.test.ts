import { describe, expect, test, vi } from 'vitest';
import { OPERATION_KINDS } from '../../../../Common/Rules/Types/OperationKinds';
import { RuleTypeRegistry } from '../../../../Common/Rules/Types/RuleTypeRegistry';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { Notifier } from '../../../Core/Notifier';
import { PanelStateFactory } from '../../../Core/PanelStateFactory';
import { Store } from '../../../Core/Store';
import { ActionForm } from './ActionForm';
import { aFileClient, controlNamed, fieldNamed, typeInto } from '../../../PanelTestData';

function aCookieForm(action: RuleAction, onChange = vi.fn()): ActionForm {
    return new ActionForm({
        type: RuleTypeRegistry.get(RULE_TYPE_IDS.RequestCookie)!,
        action,
        fileClient: aFileClient(),
        notifier: new Notifier(new Store(PanelStateFactory.initial())),
        onChange,
    });
}

function aCookieAction(overrides: RuleAction = {}): RuleAction {
    return {
        op: OPERATION_KINDS.AddOrUpdate,
        name: 'session',
        value: 'abc',
        ...overrides,
    };
}

function pickOperation(form: ActionForm, op: string): void {
    const select = fieldNamed(form.root, 'Operation').querySelector('select')!;
    select.value = op;
    select.dispatchEvent(new Event('change'));
}

describe('ActionForm', () => {
    test('constructor_WhenBuilt_ShouldRenderOneControlPerFieldFilledFromTheAction', () => {
        // Arrange
        const action = aCookieAction();

        // Act
        const form = aCookieForm(action);

        // Assert
        expect([...form.root.querySelectorAll('.field-label')].map(label => label.textContent)).toEqual([
            'Operation',
            'Cookie name',
            'Value',
        ]);
        const operation = controlNamed<HTMLSelectElement>(form.root, 'Operation');
        expect(operation.value).toBe(OPERATION_KINDS.AddOrUpdate);
        expect(fieldNamed(form.root, 'Cookie name').querySelector('input')?.value).toBe('session');
        expect(fieldNamed(form.root, 'Value').hidden).toBe(false);
    });

    test('constructor_WhenAFieldIsNotVisibleForTheAction_ShouldHideIt', () => {
        // Arrange
        const action = aCookieAction({
            op: OPERATION_KINDS.Remove,
        });

        // Act
        const form = aCookieForm(action);

        // Assert
        expect(fieldNamed(form.root, 'Value').hidden).toBe(true);
        expect(fieldNamed(form.root, 'Cookie name').hidden).toBe(false);
    });

    test('field_WhenEdited_ShouldReportTheWholeActionWithTheChange', () => {
        // Arrange
        const onChange = vi.fn();
        const form = aCookieForm(aCookieAction(), onChange);

        // Act
        typeInto(fieldNamed(form.root, 'Cookie name').querySelector('input')!, 'theme');

        // Assert
        expect(onChange).toHaveBeenLastCalledWith(aCookieAction({
            name: 'theme',
        }));
    });

    test('field_WhenEditedTwice_ShouldKeepBothChanges', () => {
        // Arrange
        const onChange = vi.fn();
        const form = aCookieForm(aCookieAction(), onChange);
        typeInto(fieldNamed(form.root, 'Cookie name').querySelector('input')!, 'theme');

        // Act
        typeInto(fieldNamed(form.root, 'Value').querySelector('input')!, 'dark');

        // Assert
        expect(onChange).toHaveBeenLastCalledWith(aCookieAction({
            name: 'theme',
            value: 'dark',
        }));
    });

    test.each([
        [
            OPERATION_KINDS.Remove,
            true,
        ],
        [
            OPERATION_KINDS.Add,
            false,
        ],
    ])('operation_WhenSwitchedTo(%s)_ShouldSetValueHiddenTo(%s)', (op, isHidden) => {
        // Arrange
        const form = aCookieForm(aCookieAction({
            op: OPERATION_KINDS.AddOrUpdate,
        }));

        // Act
        pickOperation(form, op);

        // Assert
        expect(fieldNamed(form.root, 'Value').hidden).toBe(isHidden);
    });

    test('field_WhenEdited_ShouldLeaveTheGivenActionUntouched', () => {
        // Arrange
        const action = aCookieAction();
        const form = aCookieForm(action);

        // Act
        typeInto(fieldNamed(form.root, 'Cookie name').querySelector('input')!, 'theme');

        // Assert
        expect(action).toEqual(aCookieAction());
    });
});
