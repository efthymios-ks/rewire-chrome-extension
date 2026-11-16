import { beforeEach, describe, expect, test } from 'vitest';
import { SplitPane } from './SplitPane';
import { click } from '../../PanelTestData';

const COLLAPSED_KEY = 'rewire.inspectorCollapsed';

function aPane(): SplitPane {
    return new SplitPane(
        /* first: */ document.createElement('div'),
        /* second: */ document.createElement('div'),
    );
}

function toggleOf(pane: SplitPane): HTMLButtonElement {
    return pane.root.querySelector<HTMLButtonElement>('.split-toggle')!;
}

describe('SplitPane', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('constructor_WhenNothingIsRemembered_ShouldShowTheInspector', () => {
        // Arrange
        const expected = 'false';

        // Act
        const pane = aPane();

        // Assert
        expect(pane.root.dataset['collapsed']).toBe(expected);
        expect(toggleOf(pane).getAttribute('aria-label')).toBe('Hide the inspector');
        expect(toggleOf(pane).getAttribute('aria-expanded')).toBe('true');
    });

    test('toggle_WhenClicked_ShouldSlideTheInspectorAwayAndRememberIt', () => {
        // Arrange
        const pane = aPane();

        // Act
        click(toggleOf(pane));

        // Assert
        expect(pane.root.dataset['collapsed']).toBe('true');
        expect(toggleOf(pane).getAttribute('aria-label')).toBe('Show the inspector');
        expect(localStorage.getItem(COLLAPSED_KEY)).toBe('true');
    });

    test('constructor_WhenTheInspectorWasHidden_ShouldStartHidden', () => {
        // Arrange
        localStorage.setItem(COLLAPSED_KEY, 'true');

        // Act
        const pane = aPane();

        // Assert
        expect(pane.root.dataset['collapsed']).toBe('true');
    });

    test('expand_WhenTheInspectorIsHidden_ShouldBringItBackAndRememberIt', () => {
        // Arrange
        localStorage.setItem(COLLAPSED_KEY, 'true');
        const pane = aPane();

        // Act
        pane.expand();

        // Assert
        expect(pane.root.dataset['collapsed']).toBe('false');
        expect(localStorage.getItem(COLLAPSED_KEY)).toBe('false');
    });

    test('keydown_WhenAnArrowMovesTheHandle_ShouldBringTheInspectorBack', () => {
        // Arrange
        localStorage.setItem(COLLAPSED_KEY, 'true');
        const pane = aPane();

        // Act
        pane.root.querySelector('.split-handle')!.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowUp',
        }));

        // Assert
        expect(pane.root.dataset['collapsed']).toBe('false');
    });
});
