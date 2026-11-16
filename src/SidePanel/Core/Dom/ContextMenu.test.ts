import { afterEach, describe, expect, test, vi } from 'vitest';
import { ContextMenu } from './ContextMenu';
import { buttonNamed, click } from '../../PanelTestData';

function openMenu(run = vi.fn()): ContextMenu {
    const menu = new ContextMenu();
    menu.open({
        items: [
            {
                label: 'Copy URL',
                run,
            },
            {
                label: 'Pin endpoint',
                run: vi.fn(),
            },
        ],
        clientX: 40,
        clientY: 60,
    });

    return menu;
}

function shownMenus(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[role="menu"]')];
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

describe('ContextMenu', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.replaceChildren();
    });

    test('open_WhenItemsAreGiven_ShouldShowThemAsMenuItemsAndFocusTheFirst', () => {
        // Arrange
        const items = ['Copy URL', 'Pin endpoint'];

        // Act
        openMenu();

        // Assert
        const menuItems = [...document.querySelectorAll('[role="menuitem"]')];
        expect(menuItems.map(item => item.textContent)).toEqual(items);
        expect(document.activeElement).toBe(menuItems[0]);
    });

    test('open_WhenThePointIsInsideTheWindow_ShouldPlaceTheMenuThere', () => {
        // Arrange
        const point = {
            left: '40px',
            top: '60px',
        };

        // Act
        openMenu();

        // Assert
        const [menu] = shownMenus();
        expect(menu?.style.left).toBe(point.left);
        expect(menu?.style.top).toBe(point.top);
    });

    test('open_WhenThePointIsOffscreen_ShouldClampItIntoTheWindow', () => {
        // Arrange
        const menu = new ContextMenu();

        // Act
        menu.open({
            items: [],
            clientX: -50,
            clientY: window.innerHeight + 100,
        });

        // Assert
        const [shown] = shownMenus();
        expect(shown?.style.left).toBe('0px');
        expect(shown?.style.top).toBe(`${window.innerHeight}px`);
    });

    test('open_WhenAlreadyOpen_ShouldReplaceThePreviousMenu', () => {
        // Arrange
        const menu = openMenu();

        // Act
        menu.open({
            items: [
                {
                    label: 'Mock response',
                    run: vi.fn(),
                },
            ],
            clientX: 0,
            clientY: 0,
        });

        // Assert
        expect(shownMenus()).toHaveLength(1);
        expect(shownMenus()[0]?.textContent).toBe('Mock response');
    });

    test('click_WhenAnItemIsPicked_ShouldCloseAndRunIt', () => {
        // Arrange
        const run = vi.fn();
        openMenu(run);

        // Act
        click(buttonNamed(document, 'Copy URL'));

        // Assert
        expect(run).toHaveBeenCalledOnce();
        expect(shownMenus()).toHaveLength(0);
    });

    test('click_WhenClickingElsewhere_ShouldClose', () => {
        // Arrange
        openMenu();

        // Act
        click(document.body);

        // Assert
        expect(shownMenus()).toHaveLength(0);
    });

    test('keydown_WhenEscapeIsPressed_ShouldClose', () => {
        // Arrange
        openMenu();

        // Act
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
        }));

        // Assert
        expect(shownMenus()).toHaveLength(0);
    });

    test('keydown_WhenAnotherKeyIsPressed_ShouldStayOpen', () => {
        // Arrange
        openMenu();

        // Act
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown',
        }));

        // Assert
        expect(shownMenus()).toHaveLength(1);
    });

    test('blur_WhenTheWindowLosesFocus_ShouldClose', () => {
        // Arrange
        openMenu();

        // Act
        window.dispatchEvent(new Event('blur'));

        // Assert
        expect(shownMenus()).toHaveLength(0);
    });

    test('close_WhenNothingIsOpen_ShouldDoNothing', () => {
        // Arrange
        const menu = new ContextMenu();

        // Act
        menu.close();

        // Assert
        expect(shownMenus()).toHaveLength(0);
    });

    test('constructor_WhenBuilt_ShouldNotListenToThePageYet', () => {
        // Arrange
        const documentListeners = watchListeners(document);
        const windowListeners = watchListeners(window);

        // Act
        new ContextMenu();

        // Assert
        expect([
            ...documentListeners,
            ...windowListeners,
        ]).toEqual([]);
    });

    test('close_WhenTheMenuCloses_ShouldStopListeningToThePage', () => {
        // Arrange
        const documentListeners = watchListeners(document);
        const windowListeners = watchListeners(window);
        const menu = openMenu();

        // Act
        menu.close();

        // Assert
        const added = [
            ...documentListeners,
            ...windowListeners,
        ];
        expect(added.map(listener => listener.type)).toEqual([
            'click',
            'keydown',
            'blur',
        ]);
        expect(added.every(listener => listener.signal?.aborted === true)).toBe(true);
    });
});
