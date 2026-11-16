import { afterEach, describe, expect, test, vi } from 'vitest';
import { type CheckChoice, CheckDropdown } from './CheckDropdown';

type Area = 'url' | 'query' | 'body';

const CHOICES: CheckChoice<Area>[] = [
    {
        key: 'url',
        label: 'URL',
        title: 'Search the URL',
    },
    {
        key: 'query',
        label: 'Query',
        title: 'Search the query',
    },
    {
        key: 'body',
        label: 'Body',
        title: 'Search the body',
    },
];

function build(selected: Area[], onChange = vi.fn()): CheckDropdown<Area> {
    const dropdown = new CheckDropdown({
        label: 'Search in',
        choices: CHOICES,
        selected,
        onChange,
    });
    document.body.append(dropdown.root);

    return dropdown;
}

function checkboxOf(dropdown: CheckDropdown<Area>, text: string): HTMLInputElement {
    const row = [...dropdown.root.querySelectorAll('label')].find(label => label.textContent === text);
    const input = row?.querySelector('input');
    if (input == null) {
        throw new Error(`No checkbox named ${text}.`);
    }

    return input;
}

function toggle(input: HTMLInputElement): void {
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
}

function checkedTexts(dropdown: CheckDropdown<Area>): string[] {
    return [...dropdown.root.querySelectorAll('label')]
        .filter(label => label.querySelector('input')?.checked === true)
        .map(label => label.textContent ?? '');
}

function summaryOf(dropdown: CheckDropdown<Area>): HTMLElement {
    return dropdown.root.querySelector('summary')!;
}

function openList(dropdown: CheckDropdown<Area>): void {
    dropdown.root.open = true;
    dropdown.root.dispatchEvent(new Event('toggle'));
}

describe('CheckDropdown', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('constructor_WhenOneChoiceIsSelected_ShouldShowItsLabelAndListEveryChoice', () => {
        // Arrange
        const selected: Area[] = ['url'];

        // Act
        const dropdown = build(selected);

        // Assert
        expect(summaryOf(dropdown).textContent).toBe('URL');
        expect(summaryOf(dropdown).getAttribute('aria-label')).toBe('Search in: URL');
        expect([...dropdown.root.querySelectorAll('label')].map(label => label.textContent)).toEqual([
            'URL',
            'Query',
            'Body',
        ]);
        expect(dropdown.root.querySelector('label')?.title).toBe('Search the URL');
        expect(checkedTexts(dropdown)).toEqual(['URL']);
    });

    test('constructor_WhenSeveralChoicesAreSelected_ShouldShowTheFirstLabelAndHowManyMore', () => {
        // Arrange
        const selected: Area[] = [
            'body',
            'url',
            'query',
        ];

        // Act
        const dropdown = build(selected);

        // Assert
        expect(summaryOf(dropdown).textContent).toBe('URL +2');
        expect(summaryOf(dropdown).getAttribute('aria-label')).toBe('Search in: URL, Query, Body');
    });

    test('change_WhenAChoiceIsChecked_ShouldReportTheSelectionInListOrder', () => {
        // Arrange
        const onChange = vi.fn();
        const dropdown = build(['body'], onChange);

        // Act
        toggle(checkboxOf(dropdown, 'URL'));

        // Assert
        expect(onChange).toHaveBeenCalledWith([
            'url',
            'body',
        ]);
        expect(summaryOf(dropdown).textContent).toBe('URL +1');
    });

    test('change_WhenAChoiceIsUncheckedWhileAnotherStaysOn_ShouldReportTheRest', () => {
        // Arrange
        const onChange = vi.fn();
        const dropdown = build(['url', 'query'], onChange);

        // Act
        toggle(checkboxOf(dropdown, 'URL'));

        // Assert
        expect(onChange).toHaveBeenCalledWith(['query']);
        expect(checkedTexts(dropdown)).toEqual(['Query']);
        expect(summaryOf(dropdown).textContent).toBe('Query');
    });

    test('change_WhenTheLastCheckedChoiceIsUnchecked_ShouldKeepItCheckedAndReportNothing', () => {
        // Arrange
        const onChange = vi.fn();
        const dropdown = build(['url'], onChange);

        // Act
        toggle(checkboxOf(dropdown, 'URL'));

        // Assert
        expect(onChange).not.toHaveBeenCalled();
        expect(checkedTexts(dropdown)).toEqual(['URL']);
        expect(summaryOf(dropdown).textContent).toBe('URL');
    });

    test('setSelected_WhenCalled_ShouldCheckTheBoxesAndRelabelTheSummary', () => {
        // Arrange
        const onChange = vi.fn();
        const dropdown = build(['url'], onChange);

        // Act
        dropdown.setSelected(['query', 'body']);

        // Assert
        expect(checkedTexts(dropdown)).toEqual([
            'Query',
            'Body',
        ]);
        expect(summaryOf(dropdown).textContent).toBe('Query +1');
        expect(onChange).not.toHaveBeenCalled();
    });

    test('keydown_WhenEscapeIsPressedWhileOpen_ShouldCloseAndFocusTheSummary', () => {
        // Arrange
        const dropdown = build(['url']);
        openList(dropdown);

        // Act
        checkboxOf(dropdown, 'Query').dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
        }));

        // Assert
        expect(dropdown.root.open).toBe(false);
        expect(document.activeElement).toBe(summaryOf(dropdown));
    });

    test.each([
        [
            'outside',
            false,
        ],
        [
            'inside',
            true,
        ],
    ])('pointerdown_WhenItLands(%s)WhileOpen_ShouldCloseOnlyOutside', (where, expected) => {
        // Arrange
        const dropdown = build(['url']);
        const outside = document.createElement('button');
        document.body.append(outside);
        openList(dropdown);
        const target = where === 'outside' ? outside : checkboxOf(dropdown, 'Query');

        // Act
        target.dispatchEvent(new Event('pointerdown', {
            bubbles: true,
        }));

        // Assert
        expect(dropdown.root.open).toBe(expected);
    });
});
