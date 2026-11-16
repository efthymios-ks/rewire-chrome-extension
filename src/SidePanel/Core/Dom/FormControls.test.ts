import { describe, expect, test, vi } from 'vitest';
import { BUTTON_VARIANTS } from './ButtonVariants';
import { FormControls } from './FormControls';
import { click, typeInto } from '../../PanelTestData';

function change(control: HTMLElement): void {
    control.dispatchEvent(new Event('change', {
        bubbles: true,
    }));
}

function toggle(input: HTMLInputElement): void {
    input.checked = !input.checked;
    change(input);
}

describe('FormControls', () => {
    test('textInput_WhenBuiltWithDefaults_ShouldBeAPlainTextInputWithTheValue', () => {
        // Arrange
        const value = 'https://api.example.com';

        // Act
        const input = FormControls.textInput({
            value,
        });

        // Assert
        expect(input.value).toBe(value);
        expect(input.type).toBe('text');
        expect(input.className).toBe('input');
        expect(input.placeholder).toBe('');
        expect(input.getAttribute('spellcheck')).toBe('false');
    });

    test('textInput_WhenOptionsAreGiven_ShouldApplyThem', () => {
        // Arrange
        const options = {
            value: '',
            placeholder: 'Search',
            type: 'search',
            className: 'input search-input',
        };

        // Act
        const input = FormControls.textInput(options);

        // Assert
        expect(input.type).toBe('search');
        expect(input.placeholder).toBe('Search');
        expect(input.className).toBe('input search-input');
    });

    test('textInput_WhenTypedIntoAndCommitted_ShouldReportBoth', () => {
        // Arrange
        const onInput = vi.fn();
        const onChange = vi.fn();
        const input = FormControls.textInput({
            value: '',
            onInput,
            onChange,
        });

        // Act
        typeInto(input, 'users');
        change(input);

        // Assert
        expect(onInput).toHaveBeenCalledWith('users');
        expect(onChange).toHaveBeenCalledWith('users');
    });

    test('textInput_WhenNoHandlersAreGiven_ShouldIgnoreEdits', () => {
        // Arrange
        const input = FormControls.textInput({
            value: '',
        });

        // Act
        const edit = () => {
            typeInto(input, 'users');
            change(input);
        };

        // Assert
        expect(edit).not.toThrow();
    });

    test('searchInput_WhenBuilt_ShouldWrapALabelledInputAndAClearButton', () => {
        // Arrange
        const onInput = vi.fn();

        // Act
        const box = FormControls.searchInput({
            value: 'users',
            placeholder: 'Search',
            ariaLabel: 'Search traffic',
            className: 'traffic-search',
            onInput,
        });

        // Assert
        const input = box.querySelector('input');
        expect(box.className).toBe('search-box traffic-search');
        expect(input?.value).toBe('users');
        expect(input?.placeholder).toBe('Search');
        expect(input?.getAttribute('aria-label')).toBe('Search traffic');
        expect(box.querySelector('.search-clear')?.getAttribute('aria-label')).toBe('Clear search');
    });

    test.each([
        [
            '',
            true,
        ],
        [
            'users',
            false,
        ],
    ])('searchInput_WhenTheValueIs(%s)_ShouldHideTheClearButtonOnlyWhenEmpty', (value, expected) => {
        // Arrange
        const box = FormControls.searchInput({
            value: '',
            placeholder: 'Search',
            ariaLabel: 'Search',
            onInput: vi.fn(),
        });

        // Act
        typeInto(box.querySelector('input')!, value);

        // Assert
        expect(box.className).toBe('search-box');
        expect(box.querySelector<HTMLButtonElement>('.search-clear')?.hidden).toBe(expected);
    });

    test('searchInput_WhenClearIsClicked_ShouldEmptyAndFocusTheInputAndReportIt', () => {
        // Arrange
        const onInput = vi.fn();
        const box = FormControls.searchInput({
            value: '',
            placeholder: 'Search',
            ariaLabel: 'Search',
            onInput,
        });
        document.body.append(box);
        const input = box.querySelector('input')!;
        typeInto(input, 'users');
        input.blur();

        // Act
        click(box.querySelector('.search-clear'));

        // Assert
        expect(input.value).toBe('');
        expect(onInput).toHaveBeenLastCalledWith('');
        expect(box.querySelector<HTMLButtonElement>('.search-clear')?.hidden).toBe(true);
        expect(document.activeElement).toBe(input);
        box.remove();
    });

    test('textArea_WhenBuiltWithDefaults_ShouldBeACodeInputWithTheRows', () => {
        // Arrange
        const value = '{"id":42}';

        // Act
        const textArea = FormControls.textArea({
            value,
            rows: 6,
        });

        // Assert
        expect(textArea.value).toBe(value);
        expect(textArea.getAttribute('rows')).toBe('6');
        expect(textArea.className).toBe('input code-input');
        expect(textArea.getAttribute('spellcheck')).toBe('false');
    });

    test('textArea_WhenTypedIntoAndCommitted_ShouldReportBoth', () => {
        // Arrange
        const onInput = vi.fn();
        const onChange = vi.fn();
        const textArea = FormControls.textArea({
            value: '',
            rows: 3,
            className: 'input',
            placeholder: 'Body',
            onInput,
            onChange,
        });

        // Act
        typeInto(textArea, '{}');
        change(textArea);

        // Assert
        expect(textArea.className).toBe('input');
        expect(textArea.placeholder).toBe('Body');
        expect(onInput).toHaveBeenCalledWith('{}');
        expect(onChange).toHaveBeenCalledWith('{}');
    });

    test('checkbox_WhenToggled_ShouldReportTheNewState', () => {
        // Arrange
        const onChange = vi.fn();
        const label = FormControls.checkbox({
            checked: false,
            label: 'Regex',
            onChange,
        });
        const input = label.querySelector('input')!;

        // Act
        toggle(input);

        // Assert
        expect(label.className).toBe('checkbox');
        expect(label.textContent).toBe('Regex');
        expect(onChange).toHaveBeenCalledWith(true);
    });

    test('checkbox_WhenBuiltChecked_ShouldStartChecked', () => {
        // Arrange
        const checked = true;

        // Act
        const label = FormControls.checkbox({
            checked,
            label: 'Wrap',
            className: 'checkbox compact',
            onChange: vi.fn(),
        });

        // Assert
        expect(label.querySelector('input')?.checked).toBe(true);
        expect(label.className).toBe('checkbox compact');
    });

    test('toggleSwitch_WhenBuilt_ShouldBeACheckboxWithTheSwitchRole', () => {
        // Arrange
        const onChange = vi.fn();
        const toggleSwitch = FormControls.toggleSwitch({
            checked: true,
            label: 'Enabled',
            onChange,
        });

        // Act
        toggle(toggleSwitch.querySelector('input')!);

        // Assert
        expect(toggleSwitch.className).toBe('switch');
        expect(toggleSwitch.querySelector('input')?.getAttribute('role')).toBe('switch');
        expect(onChange).toHaveBeenCalledWith(false);
    });

    test('select_WhenBuilt_ShouldListTheOptionsAndSelectTheValue', () => {
        // Arrange
        const options = [
            {
                value: 'get',
                label: 'GET',
            },
            {
                value: 'post',
                label: 'POST',
            },
        ];

        // Act
        const select = FormControls.select({
            options,
            value: 'post',
            onChange: vi.fn(),
        });

        // Assert
        expect([...select.options].map(option => option.textContent)).toEqual([
            'GET',
            'POST',
        ]);
        expect(select.value).toBe('post');
        expect(select.className).toBe('input');
    });

    test('select_WhenChanged_ShouldReportTheValue', () => {
        // Arrange
        const onChange = vi.fn();
        const select = FormControls.select({
            options: [
                {
                    value: 'get',
                    label: 'GET',
                },
                {
                    value: 'post',
                    label: 'POST',
                },
            ],
            value: 'get',
            className: 'input method',
            onChange,
        });

        // Act
        select.value = 'post';
        change(select);

        // Assert
        expect(onChange).toHaveBeenCalledWith('post');
    });

    test('button_WhenBuiltWithDefaults_ShouldUseTheTextAsTitleAndNoAriaLabel', () => {
        // Arrange
        const onClick = vi.fn();

        // Act
        const button = FormControls.button({
            text: 'Clear',
            onClick,
        });

        // Assert
        expect(button.type).toBe('button');
        expect(button.className).toBe(BUTTON_VARIANTS.Default);
        expect(button.textContent).toBe('Clear');
        expect(button.title).toBe('Clear');
        expect(button.hasAttribute('aria-label')).toBe(false);
    });

    test('button_WhenOptionsAreGiven_ShouldApplyThemAndRunOnClick', () => {
        // Arrange
        const onClick = vi.fn();
        const button = FormControls.button({
            text: '×',
            onClick,
            variant: BUTTON_VARIANTS.Ghost,
            title: 'Remove header',
            ariaLabel: 'Remove header',
        });

        // Act
        click(button);

        // Assert
        expect(button.className).toBe(BUTTON_VARIANTS.Ghost);
        expect(button.title).toBe('Remove header');
        expect(button.getAttribute('aria-label')).toBe('Remove header');
        expect(onClick).toHaveBeenCalledOnce();
    });

    test('field_WhenAHintIsGiven_ShouldShowLabelControlAndHint', () => {
        // Arrange
        const control = document.createElement('input');

        // Act
        const field = FormControls.field({
            label: 'Name',
            control,
            hint: 'Shown in the rule list.',
        });

        // Assert
        expect(field.querySelector('.field-label')?.textContent).toBe('Name');
        expect(field.contains(control)).toBe(true);
        expect(field.querySelector('.field-hint')?.textContent).toBe('Shown in the rule list.');
    });

    test('field_WhenNoHintIsGiven_ShouldOmitIt', () => {
        // Arrange
        const control = document.createElement('input');

        // Act
        const field = FormControls.field({
            label: 'Name',
            control,
        });

        // Assert
        expect(field.querySelector('.field-hint')).toBeNull();
        expect(field.childElementCount).toBe(2);
    });
});
