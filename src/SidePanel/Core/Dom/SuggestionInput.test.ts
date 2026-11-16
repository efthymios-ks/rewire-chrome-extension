import { afterEach, describe, expect, test, vi } from 'vitest';
import { SuggestionInput, type SuggestionSource } from './SuggestionInput';
import { typeInto } from '../../PanelTestData';

const HEADERS = [
    'Accept',
    'Accept-Encoding',
    'Authorization',
];

interface BuildOptions {
    suggestions?: SuggestionSource;
    onInput?: (value: string) => void;
    label?: string;
    wrapperClassName?: string;
}

function build({
    suggestions = HEADERS,
    onInput = vi.fn(),
    label,
    wrapperClassName,
}: BuildOptions = {}) {
    const root = SuggestionInput.build({
        value: '',
        placeholder: 'Header name',
        suggestions,
        onInput,
        label,
        wrapperClassName,
    });
    document.body.append(root);
    const input = root.querySelector('input')!;
    const list = root.querySelector<HTMLUListElement>('[role="listbox"]')!;

    return {
        root,
        input,
        list,
    };
}

function press(input: HTMLInputElement, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
    });
    input.dispatchEvent(event);

    return event;
}

function optionTexts(list: HTMLElement): string[] {
    return [...list.querySelectorAll('[role="option"]')].map(option => option.textContent ?? '');
}

function selectedOption(list: HTMLElement): string | null {
    return list.querySelector('[aria-selected="true"]')?.textContent ?? null;
}

interface AddedListener {
    type: string;
    signal: AbortSignal | undefined;
}

function watchListeners(target: EventTarget): AddedListener[] {
    const added: AddedListener[] = [];
    const addEventListener = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation((
        type,
        listener,
        options,
    ) => {
        added.push({
            type,
            signal: typeof options === 'object' ? options.signal : undefined,
        });
        addEventListener(
            /* type: */ type,
            /* listener: */ listener,
            /* options: */ options,
        );
    });

    return added;
}

describe('SuggestionInput', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.replaceChildren();
    });

    test('build_WhenBuilt_ShouldBeAClosedCombobox', () => {
        // Arrange
        const label = 'Header name';

        // Act
        const { root, input, list } = build({
            label,
            wrapperClassName: 'grow',
        });

        // Assert
        expect(root.className).toBe('suggestion-input grow');
        expect(input.getAttribute('role')).toBe('combobox');
        expect(input.getAttribute('aria-label')).toBe(label);
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(input.getAttribute('aria-controls')).toBe(list.id);
        expect(list.hidden).toBe(true);
    });

    test('build_WhenNoLabelIsGiven_ShouldOmitTheAriaLabel', () => {
        // Arrange
        const options = {};

        // Act
        const { root, input } = build(options);

        // Assert
        expect(root.className).toBe('suggestion-input');
        expect(input.hasAttribute('aria-label')).toBe(false);
    });

    test('input_WhenTypingMatchesSuggestions_ShouldReportAndOpenTheList', () => {
        // Arrange
        const onInput = vi.fn();
        const { input, list } = build({
            onInput,
        });

        // Act
        typeInto(input, 'acc');

        // Assert
        expect(onInput).toHaveBeenCalledWith('acc');
        expect(list.hidden).toBe(false);
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(optionTexts(list)).toEqual([
            'Accept',
            'Accept-Encoding',
        ]);
    });

    test('input_WhenNothingMatches_ShouldKeepTheListClosed', () => {
        // Arrange
        const { input, list } = build();

        // Act
        typeInto(input, 'x-trace');

        // Assert
        expect(list.hidden).toBe(true);
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    test('focus_WhenTheSuggestionsAreAFunction_ShouldReadThemFresh', () => {
        // Arrange
        let names = ['Cookie'];
        const { input, list } = build({
            suggestions: () => names,
        });
        names = ['Cache-Control'];

        // Act
        input.focus();

        // Assert
        expect(optionTexts(list)).toEqual(['Cache-Control']);
    });

    test('blur_WhenOpen_ShouldClose', () => {
        // Arrange
        const { input, list } = build();
        input.focus();

        // Act
        input.blur();

        // Assert
        expect(list.hidden).toBe(true);
    });

    test('keydown_WhenArrowDownIsPressed_ShouldHighlightTheNextOption', () => {
        // Arrange
        const { input, list } = build();
        typeInto(input, 'a');

        // Act
        const event = press(input, 'ArrowDown');

        // Assert
        expect(selectedOption(list)).toBe('Accept');
        expect(input.getAttribute('aria-activedescendant')).toBe(`${list.id}-0`);
        expect(event.defaultPrevented).toBe(true);
    });

    test('keydown_WhenArrowUpIsPressedFirst_ShouldWrapToTheLastOption', () => {
        // Arrange
        const { input, list } = build();
        typeInto(input, 'a');

        // Act
        press(input, 'ArrowUp');

        // Assert
        expect(selectedOption(list)).toBe('Authorization');
    });

    test('keydown_WhenArrowDownPassesTheLastOption_ShouldWrapToTheFirst', () => {
        // Arrange
        const { input, list } = build();
        typeInto(input, 'a');

        // Act
        press(input, 'ArrowDown');
        press(input, 'ArrowDown');
        press(input, 'ArrowDown');
        press(input, 'ArrowDown');

        // Assert
        expect(selectedOption(list)).toBe('Accept');
    });

    test('keydown_WhenArrowDownIsPressedWhileClosed_ShouldOpenWithNothingHighlighted', () => {
        // Arrange
        const { input, list } = build();
        input.value = 'auth';

        // Act
        press(input, 'ArrowDown');

        // Assert
        expect(list.hidden).toBe(false);
        expect(selectedOption(list)).toBeNull();
        expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    });

    test('keydown_WhenEnterIsPressedOnAHighlightedOption_ShouldPickIt', () => {
        // Arrange
        const onInput = vi.fn();
        const { input, list } = build({
            onInput,
        });
        typeInto(input, 'acc');
        press(input, 'ArrowDown');
        press(input, 'ArrowDown');

        // Act
        const event = press(input, 'Enter');

        // Assert
        expect(input.value).toBe('Accept-Encoding');
        expect(onInput).toHaveBeenLastCalledWith('Accept-Encoding');
        expect(list.hidden).toBe(true);
        expect(event.defaultPrevented).toBe(true);
    });

    test('keydown_WhenEnterIsPressedWithNothingHighlighted_ShouldLetItThrough', () => {
        // Arrange
        const { input } = build();
        typeInto(input, 'acc');

        // Act
        const event = press(input, 'Enter');

        // Assert
        expect(input.value).toBe('acc');
        expect(event.defaultPrevented).toBe(false);
    });

    test('keydown_WhenTabIsPressedOnAHighlightedOption_ShouldPickItButKeepTheTab', () => {
        // Arrange
        const { input } = build();
        typeInto(input, 'auth');
        press(input, 'ArrowDown');

        // Act
        const event = press(input, 'Tab');

        // Assert
        expect(input.value).toBe('Authorization');
        expect(event.defaultPrevented).toBe(false);
    });

    test('keydown_WhenEscapeIsPressedWhileOpen_ShouldCloseAndSwallowIt', () => {
        // Arrange
        const { input, list } = build();
        typeInto(input, 'a');

        // Act
        const event = press(input, 'Escape');

        // Assert
        expect(list.hidden).toBe(true);
        expect(event.defaultPrevented).toBe(true);
    });

    test('keydown_WhenEscapeIsPressedWhileClosed_ShouldLetItThrough', () => {
        // Arrange
        const { input } = build();

        // Act
        const event = press(input, 'Escape');

        // Assert
        expect(event.defaultPrevented).toBe(false);
    });

    test('keydown_WhenAnotherKeyIsPressed_ShouldLetItThrough', () => {
        // Arrange
        const { input } = build();
        typeInto(input, 'a');

        // Act
        const event = press(input, 'x');

        // Assert
        expect(event.defaultPrevented).toBe(false);
    });

    test('mousedown_WhenAnOptionIsPressed_ShouldPickIt', () => {
        // Arrange
        const onInput = vi.fn();
        const { input, list } = build({
            onInput,
        });
        typeInto(input, 'acc');
        const option = [...list.querySelectorAll('[role="option"]')][1]!;
        const event = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
        });

        // Act
        option.dispatchEvent(event);

        // Assert
        expect(input.value).toBe('Accept-Encoding');
        expect(onInput).toHaveBeenLastCalledWith('Accept-Encoding');
        expect(list.hidden).toBe(true);
        expect(event.defaultPrevented).toBe(true);
    });

    test('scroll_WhenTheWindowScrolls_ShouldClose', () => {
        // Arrange
        const { input, list } = build();
        typeInto(input, 'a');

        // Act
        window.dispatchEvent(new Event('scroll'));

        // Assert
        expect(list.hidden).toBe(true);
    });

    test('scroll_WhenTheListItselfScrolls_ShouldStayOpen', () => {
        // Arrange
        const { input, list } = build();
        typeInto(input, 'a');
        press(input, 'ArrowDown');

        // Act
        list.dispatchEvent(new Event('scroll'));

        // Assert
        expect(list.hidden).toBe(false);
        expect(selectedOption(list)).toBe('Accept');
    });

    test('scroll_WhenAnElementOutsideTheListScrolls_ShouldClose', () => {
        // Arrange
        const { input, list } = build();
        const outside = document.createElement('div');
        document.body.append(outside);
        typeInto(input, 'a');

        // Act
        outside.dispatchEvent(new Event('scroll'));

        // Assert
        expect(list.hidden).toBe(true);
    });

    test('resize_WhenTheWindowResizes_ShouldClose', () => {
        // Arrange
        const { input, list } = build();
        typeInto(input, 'a');

        // Act
        window.dispatchEvent(new Event('resize'));

        // Assert
        expect(list.hidden).toBe(true);
    });

    test('build_WhenBuilt_ShouldNotListenToTheWindowYet', () => {
        // Arrange
        const windowListeners = watchListeners(window);

        // Act
        build();

        // Assert
        expect(windowListeners).toEqual([]);
    });

    test('blur_WhenTheListCloses_ShouldStopListeningToTheWindow', () => {
        // Arrange
        const windowListeners = watchListeners(window);
        const { input } = build();
        typeInto(input, 'a');
        typeInto(input, 'ac');

        // Act
        input.dispatchEvent(new Event('blur'));

        // Assert
        expect(windowListeners.map(listener => listener.type)).toEqual([
            'scroll',
            'resize',
        ]);
        expect(windowListeners.every(listener => listener.signal?.aborted === true)).toBe(true);
    });
});
