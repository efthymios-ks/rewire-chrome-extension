import { describe, expect, test } from 'vitest';
import { PANEL_THEMES } from './PanelTheme';
import { ThemeResolver } from './ThemeResolver';

describe('ThemeResolver', () => {
    test.each([
        [
            PANEL_THEMES.System,
            true,
            PANEL_THEMES.Dark,
        ],
        [
            PANEL_THEMES.System,
            false,
            PANEL_THEMES.Light,
        ],
        [
            PANEL_THEMES.Light,
            true,
            PANEL_THEMES.Light,
        ],
        [
            PANEL_THEMES.Dark,
            false,
            PANEL_THEMES.Dark,
        ],
    ])('effective_WhenThemeIs(%s)AndSystemPrefersDarkIs(%s)_ShouldBe(%s)', (
        theme,
        prefersDark,
        expected,
    ) => {
        // Arrange
        const chosen = theme;

        // Act
        const effective = ThemeResolver.effective(chosen, prefersDark);

        // Assert
        expect(effective).toBe(expected);
    });

    test.each([
        [
            PANEL_THEMES.System,
            true,
            PANEL_THEMES.Light,
        ],
        [
            PANEL_THEMES.System,
            false,
            PANEL_THEMES.Dark,
        ],
        [
            PANEL_THEMES.Dark,
            true,
            PANEL_THEMES.Light,
        ],
        [
            PANEL_THEMES.Light,
            true,
            PANEL_THEMES.Dark,
        ],
    ])('toggled_WhenThemeIs(%s)AndSystemPrefersDarkIs(%s)_ShouldSwitchTo(%s)', (
        theme,
        prefersDark,
        expected,
    ) => {
        // Arrange
        const chosen = theme;

        // Act
        const toggled = ThemeResolver.toggled(chosen, prefersDark);

        // Assert
        expect(toggled).toBe(expected);
    });
});
