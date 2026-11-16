import { describe, expect, test, vi } from 'vitest';
import type { CookieDraft } from './CookieDraft';
import { CookieForm } from './CookieForm';
import { buttonNamed, click, controlNamed, typeInto } from '../../PanelTestData';

function aDraft(overrides: Partial<CookieDraft> = {}): CookieDraft {
    return {
        name: 'session',
        value: 'abc123',
        domain: 'api.example.com',
        path: '/',
        hostOnly: true,
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        expiresAt: '',
        ...overrides,
    };
}

function aForm(draft: CookieDraft, isNew = true) {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const form = new CookieForm({
        draft,
        isNew,
        onSave,
        onCancel,
    });

    return {
        form,
        onSave,
        onCancel,
    };
}

function checkboxOf(form: CookieForm, label: string): HTMLInputElement {
    const checkbox = [...form.root.querySelectorAll('label.checkbox')]
        .find(candidate => candidate.textContent === label);

    return checkbox!.querySelector('input')!;
}

function toggle(input: HTMLInputElement): void {
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
}

function errorOf(form: CookieForm): string {
    return form.root.querySelector('.form-error')?.textContent ?? '';
}

describe('CookieForm', () => {
    test('constructor_WhenGivenADraft_ShouldFillEveryField', () => {
        // Arrange
        const draft = aDraft({
            expiresAt: '2030-01-02T03:04',
            sameSite: 'no_restriction',
        });

        // Act
        const { form } = aForm(draft);

        // Assert
        expect(controlNamed<HTMLInputElement>(form.root, 'Name').value).toBe('session');
        expect(controlNamed<HTMLTextAreaElement>(form.root, 'Value').value).toBe('abc123');
        expect(controlNamed<HTMLInputElement>(form.root, 'Domain').value).toBe('api.example.com');
        expect(controlNamed<HTMLInputElement>(form.root, 'Path').value).toBe('/');
        expect(controlNamed<HTMLInputElement>(form.root, 'Expires').value).toBe('2030-01-02T03:04');
        expect(controlNamed<HTMLSelectElement>(form.root, 'SameSite').value).toBe('no_restriction');
        expect(checkboxOf(form, 'Host only').checked).toBe(true);
        expect(checkboxOf(form, 'Secure').checked).toBe(true);
        expect(checkboxOf(form, 'HttpOnly').checked).toBe(false);
    });

    test.each([
        [
            true,
            false,
        ],
        [
            false,
            true,
        ],
    ])('constructor_WhenIsNewIs(%s)_ShouldSetNameReadOnlyTo(%s)', (isNew, isReadOnly) => {
        // Arrange
        const draft = aDraft();

        // Act
        const { form } = aForm(draft, isNew);

        // Assert
        expect(controlNamed<HTMLInputElement>(form.root, 'Name').readOnly).toBe(isReadOnly);
    });

    test('save_WhenFieldsAreEdited_ShouldPassTheEditedDraft', () => {
        // Arrange
        const { form, onSave } = aForm(aDraft());
        typeInto(controlNamed(form.root, 'Name'), 'token');
        typeInto(controlNamed(form.root, 'Value'), 'xyz');
        typeInto(controlNamed(form.root, 'Domain'), '  .example.com  ');
        typeInto(controlNamed(form.root, 'Path'), ' /app ');
        typeInto(controlNamed(form.root, 'Expires'), '2031-05-06T07:08');
        const sameSite = controlNamed<HTMLSelectElement>(form.root, 'SameSite');
        sameSite.value = 'strict';
        sameSite.dispatchEvent(new Event('change'));
        toggle(checkboxOf(form, 'Host only'));
        toggle(checkboxOf(form, 'Secure'));
        toggle(checkboxOf(form, 'HttpOnly'));

        // Act
        click(buttonNamed(form.root, 'Save'));

        // Assert
        expect(onSave).toHaveBeenCalledWith({
            name: 'token',
            value: 'xyz',
            domain: '.example.com',
            path: '/app',
            hostOnly: false,
            secure: false,
            httpOnly: true,
            sameSite: 'strict',
            expiresAt: '2031-05-06T07:08',
        });
        expect(errorOf(form)).toBe('');
    });

    test('save_WhenNothingIsEdited_ShouldPassACopyOfTheDraft', () => {
        // Arrange
        const draft = aDraft();
        const { form, onSave } = aForm(draft);

        // Act
        click(buttonNamed(form.root, 'Save'));

        // Assert
        expect(onSave).toHaveBeenCalledWith(draft);
        expect(onSave.mock.calls[0]?.[0]).not.toBe(draft);
    });

    test.each([
        [
            'Name',
            '   ',
        ],
        [
            'Domain',
            '   ',
        ],
    ])('save_When(%s)IsBlank_ShouldShowTheRequiredError', (label, value) => {
        // Arrange
        const { form, onSave } = aForm(aDraft());
        typeInto(controlNamed(form.root, label), value);

        // Act
        click(buttonNamed(form.root, 'Save'));

        // Assert
        expect(onSave).not.toHaveBeenCalled();
        expect(errorOf(form)).toBe('Name and domain are required.');
    });

    test('save_WhenFixedAfterAnError_ShouldClearTheErrorAndSave', () => {
        // Arrange
        const { form, onSave } = aForm(aDraft({
            name: '',
        }));
        click(buttonNamed(form.root, 'Save'));
        typeInto(controlNamed(form.root, 'Name'), 'session');

        // Act
        click(buttonNamed(form.root, 'Save'));

        // Assert
        expect(errorOf(form)).toBe('');
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    test('cancel_WhenClicked_ShouldCallOnCancelWithoutSaving', () => {
        // Arrange
        const { form, onSave, onCancel } = aForm(aDraft());

        // Act
        click(buttonNamed(form.root, 'Cancel'));

        // Assert
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onSave).not.toHaveBeenCalled();
    });

    test('showError_WhenCalled_ShouldShowTheMessage', () => {
        // Arrange
        const { form } = aForm(aDraft());

        // Act
        form.showError('Chrome rejected the cookie.');

        // Assert
        expect(errorOf(form)).toBe('Chrome rejected the cookie.');
    });

    test('submit_WhenTheFormIsSubmitted_ShouldNotNavigate', () => {
        // Arrange
        const { form } = aForm(aDraft());
        const submit = new Event('submit', {
            cancelable: true,
        });

        // Act
        form.root.dispatchEvent(submit);

        // Assert
        expect(submit.defaultPrevented).toBe(true);
    });
});
