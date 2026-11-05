import { describe, expect, test } from "vitest";
import { PanelThemes } from "../../../src/SidePanel/Core/PanelTheme";
import { ThemeResolver } from "../../../src/SidePanel/Core/ThemeResolver";

describe("ThemeResolver", () => {
    test.each([
        [
            PanelThemes.System,
            true,
            PanelThemes.Dark,
        ],
        [
            PanelThemes.System,
            false,
            PanelThemes.Light,
        ],
        [
            PanelThemes.Light,
            true,
            PanelThemes.Light,
        ],
        [
            PanelThemes.Dark,
            false,
            PanelThemes.Dark,
        ],
    ])("effective_WhenThemeIs(%s)AndSystemPrefersDarkIs(%s)_ShouldBe(%s)", (
        theme,
        prefersDark,
        expected
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
            PanelThemes.System,
            true,
            PanelThemes.Light,
        ],
        [
            PanelThemes.System,
            false,
            PanelThemes.Dark,
        ],
        [
            PanelThemes.Dark,
            true,
            PanelThemes.Light,
        ],
        [
            PanelThemes.Light,
            true,
            PanelThemes.Dark,
        ],
    ])("toggled_WhenThemeIs(%s)AndSystemPrefersDarkIs(%s)_ShouldSwitchTo(%s)", (
        theme,
        prefersDark,
        expected
    ) => {
        // Arrange
        const chosen = theme;

        // Act
        const toggled = ThemeResolver.toggled(chosen, prefersDark);

        // Assert
        expect(toggled).toBe(expected);
    });
});
