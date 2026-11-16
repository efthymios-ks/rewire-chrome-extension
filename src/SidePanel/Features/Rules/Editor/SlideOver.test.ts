import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildElement } from '../../../Core/Dom/buildElement';
import { SlideOver, type SlidePage } from './SlideOver';
import { buttonNamed, click } from '../../../PanelTestData';

function aPage(title: string, onClose?: () => void): SlidePage {
    return {
        title,
        content: buildElement('div', {
            className: `page-${title.toLowerCase()}`,
            children: [
                buildElement('input', {
                    className: 'first-input',
                }),
            ],
        }),
        onClose,
    };
}

function titleOf(slideOver: SlideOver): string {
    return slideOver.root.querySelector('.slide-title')?.textContent ?? '';
}

function bodyOf(slideOver: SlideOver): HTMLElement {
    return slideOver.root.querySelector<HTMLElement>('.slide-body')!;
}

function pressEscape(slideOver: SlideOver): void {
    slideOver.root.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
    }));
}

describe('SlideOver', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('constructor_WhenBuilt_ShouldBeAHiddenLabelledDialog', () => {
        // Act
        const slideOver = new SlideOver('Rule editor');

        // Assert
        expect(slideOver.root.hidden).toBe(true);
        expect(slideOver.root.getAttribute('role')).toBe('dialog');
        expect(slideOver.root.getAttribute('aria-label')).toBe('Rule editor');
    });

    test('push_WhenTheFirstPageOpens_ShouldShowItWithoutBackAndFocusItsFirstControl', () => {
        // Arrange
        const slideOver = new SlideOver('Rule editor');
        document.body.append(slideOver.root);
        const page = aPage('Catalog');

        // Act
        slideOver.push(page);

        // Assert
        expect(slideOver.root.hidden).toBe(false);
        expect(titleOf(slideOver)).toBe('Catalog');
        expect(bodyOf(slideOver).firstElementChild).toBe(page.content);
        expect(buttonNamed(slideOver.root, 'Back').hidden).toBe(true);
        expect(document.activeElement).toBe(page.content.querySelector('.first-input'));
    });

    test('push_WhenASecondPageOpens_ShouldShowItAndOfferBack', () => {
        // Arrange
        const slideOver = new SlideOver('Rule editor');
        slideOver.push(aPage('Catalog'));

        // Act
        slideOver.push(aPage('Editor'));

        // Assert
        expect(titleOf(slideOver)).toBe('Editor');
        expect(bodyOf(slideOver).querySelector('.page-editor')).not.toBeNull();
        expect(bodyOf(slideOver).querySelector('.page-catalog')).toBeNull();
        expect(buttonNamed(slideOver.root, 'Back').hidden).toBe(false);
    });

    test('back_WhenClicked_ShouldCloseTheTopPageAndShowThePreviousOne', () => {
        // Arrange
        const onClose = vi.fn();
        const slideOver = new SlideOver('Rule editor');
        slideOver.push(aPage('Catalog'));
        slideOver.push(aPage('Editor', onClose));

        // Act
        click(buttonNamed(slideOver.root, 'Back'));

        // Assert
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(titleOf(slideOver)).toBe('Catalog');
        expect(buttonNamed(slideOver.root, 'Back').hidden).toBe(true);
    });

    test('close_WhenClicked_ShouldCloseEveryPageTopFirst', () => {
        // Arrange
        const closed: string[] = [];
        const slideOver = new SlideOver('Rule editor');
        slideOver.push(aPage('Catalog', () => closed.push('Catalog')));
        slideOver.push(aPage('Editor', () => closed.push('Editor')));

        // Act
        click(buttonNamed(slideOver.root, 'Close'));

        // Assert
        expect(closed).toEqual([
            'Editor',
            'Catalog',
        ]);
        expect(slideOver.root.hidden).toBe(true);
        expect(titleOf(slideOver)).toBe('');
        expect(bodyOf(slideOver).childElementCount).toBe(0);
    });

    test('keydown_WhenEscapeIsPressed_ShouldCloseOnlyTheTopPageAndStopIt', () => {
        // Arrange
        const slideOver = new SlideOver('Rule editor');
        const outer = vi.fn();
        document.body.addEventListener('keydown', outer);
        document.body.append(slideOver.root);
        slideOver.push(aPage('Catalog'));
        slideOver.push(aPage('Editor'));

        // Act
        pressEscape(slideOver);

        // Assert
        expect(titleOf(slideOver)).toBe('Catalog');
        expect(outer).not.toHaveBeenCalled();
    });

    test('keydown_WhenAnotherKeyIsPressed_ShouldKeepThePage', () => {
        // Arrange
        const slideOver = new SlideOver('Rule editor');
        slideOver.push(aPage('Catalog'));

        // Act
        slideOver.root.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
        }));

        // Assert
        expect(slideOver.root.hidden).toBe(false);
        expect(titleOf(slideOver)).toBe('Catalog');
    });

    test('pop_WhenNothingIsOpen_ShouldStayClosed', () => {
        // Arrange
        const slideOver = new SlideOver('Rule editor');

        // Act
        slideOver.pop();

        // Assert
        expect(slideOver.root.hidden).toBe(true);
    });
});
