import { afterEach, describe, expect, test, vi } from 'vitest';
import { PickList } from './PickList';
import { click } from '../../PanelTestData';

const CHOICES = [
    {
        key: 'xhr',
        label: 'XHR',
    },
    {
        key: 'fetch',
        label: 'Fetch',
    },
    {
        key: 'script',
        label: 'Script',
    },
];

function build(excluded: string[] = [], onChange = vi.fn()): HTMLDetailsElement {
    const root = PickList.build({
        label: 'Types',
        choices: CHOICES,
        excluded,
        onChange,
    });
    document.body.append(root);

    return root;
}

function checkboxOf(root: HTMLElement, text: string): HTMLInputElement {
    const row = [...root.querySelectorAll('label')].find(label => label.textContent === text);
    const input = row?.querySelector('input');
    if (input == null) {
        throw new Error(`No checkbox named ${text}.`);
    }

    return input;
}

function openList(root: HTMLDetailsElement): void {
    root.open = true;
    root.dispatchEvent(new Event('toggle'));
}

describe('PickList', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('build_WhenNothingIsExcluded_ShouldCheckEveryChoiceAndAll', () => {
        // Arrange
        const excluded: string[] = [];

        // Act
        const root = build(excluded);

        // Assert
        expect(root.querySelector('summary')?.textContent).toBe('Types 3/3');
        expect(checkboxOf(root, 'All').checked).toBe(true);
        expect(checkboxOf(root, 'All').indeterminate).toBe(false);
        expect(CHOICES.every(choice => checkboxOf(root, choice.label).checked)).toBe(true);
    });

    test('build_WhenSomeAreExcluded_ShouldShowAllAsIndeterminate', () => {
        // Arrange
        const excluded = ['script'];

        // Act
        const root = build(excluded);

        // Assert
        expect(root.querySelector('summary')?.textContent).toBe('Types 2/3');
        expect(checkboxOf(root, 'All').checked).toBe(false);
        expect(checkboxOf(root, 'All').indeterminate).toBe(true);
        expect(checkboxOf(root, 'Script').checked).toBe(false);
    });

    test('build_WhenEverythingIsExcluded_ShouldNotBeIndeterminate', () => {
        // Arrange
        const excluded = CHOICES.map(choice => choice.key);

        // Act
        const root = build(excluded);

        // Assert
        expect(root.querySelector('summary')?.textContent).toBe('Types 0/3');
        expect(checkboxOf(root, 'All').indeterminate).toBe(false);
    });

    test('build_WhenAnExcludedKeyIsNoLongerAChoice_ShouldDropIt', () => {
        // Arrange
        const excluded = ['websocket'];

        // Act
        const root = build(excluded);

        // Assert
        expect(root.querySelector('summary')?.textContent).toBe('Types 3/3');
    });

    test('change_WhenAChoiceIsUnchecked_ShouldPublishItAsExcluded', () => {
        // Arrange
        const onChange = vi.fn();
        const root = build([], onChange);

        // Act
        click(checkboxOf(root, 'Fetch'));

        // Assert
        expect(onChange).toHaveBeenCalledWith(['fetch']);
        expect(root.querySelector('summary')?.textContent).toBe('Types 2/3');
    });

    test('change_WhenAnExcludedChoiceIsChecked_ShouldPublishItAsIncluded', () => {
        // Arrange
        const onChange = vi.fn();
        const root = build(['xhr', 'fetch'], onChange);

        // Act
        click(checkboxOf(root, 'XHR'));

        // Assert
        expect(onChange).toHaveBeenCalledWith(['fetch']);
    });

    test('change_WhenAllIsUnchecked_ShouldExcludeEveryChoice', () => {
        // Arrange
        const onChange = vi.fn();
        const root = build([], onChange);

        // Act
        click(checkboxOf(root, 'All'));

        // Assert
        expect(onChange).toHaveBeenCalledWith([
            'xhr',
            'fetch',
            'script',
        ]);
        expect(CHOICES.some(choice => checkboxOf(root, choice.label).checked)).toBe(false);
    });

    test('change_WhenAllIsChecked_ShouldIncludeEveryChoice', () => {
        // Arrange
        const onChange = vi.fn();
        const root = build(['script'], onChange);

        // Act
        click(checkboxOf(root, 'All'));

        // Assert
        expect(onChange).toHaveBeenCalledWith([]);
        expect(checkboxOf(root, 'Script').checked).toBe(true);
    });

    test('pointerdown_WhenOpenAndPressedOutside_ShouldClose', () => {
        // Arrange
        const root = build();
        openList(root);

        // Act
        document.body.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
        }));

        // Assert
        expect(root.open).toBe(false);
    });

    test('pointerdown_WhenOpenAndPressedInside_ShouldStayOpen', () => {
        // Arrange
        const root = build();
        openList(root);

        // Act
        checkboxOf(root, 'XHR').dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
        }));

        // Assert
        expect(root.open).toBe(true);
    });

    test('toggle_WhenClosedAgain_ShouldStopWatchingOutsidePresses', () => {
        // Arrange
        const root = build();
        openList(root);
        const removeListener = vi.spyOn(document, 'removeEventListener');

        // Act
        root.open = false;
        root.dispatchEvent(new Event('toggle'));

        // Assert
        expect(removeListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        removeListener.mockRestore();
    });
});
