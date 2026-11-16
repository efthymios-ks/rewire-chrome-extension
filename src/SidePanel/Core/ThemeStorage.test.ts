import { afterEach, describe, expect, test } from 'vitest';
import { PANEL_THEMES } from './PanelTheme';
import { ThemeStorage } from './ThemeStorage';

const THEME_STORAGE_KEY = 'rewire.theme';

describe('ThemeStorage', () => {
    afterEach(() => {
        localStorage.clear();
    });

    test('load_WhenNothingIsStored_ShouldReturnSystem', () => {
        // Arrange
        localStorage.clear();

        // Act
        const theme = ThemeStorage.load();

        // Assert
        expect(theme).toBe(PANEL_THEMES.System);
    });

    test('load_WhenAThemeWasSaved_ShouldReturnIt', () => {
        // Arrange
        ThemeStorage.save(PANEL_THEMES.Dark);

        // Act
        const theme = ThemeStorage.load();

        // Assert
        expect(theme).toBe(PANEL_THEMES.Dark);
    });

    test('load_WhenTheStoredValueIsUnknown_ShouldReturnSystem', () => {
        // Arrange
        localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

        // Act
        const theme = ThemeStorage.load();

        // Assert
        expect(theme).toBe(PANEL_THEMES.System);
    });
});
