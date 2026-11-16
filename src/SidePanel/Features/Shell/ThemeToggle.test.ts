import { afterEach, describe, expect, test, vi } from 'vitest';
import { PANEL_THEMES, type PanelTheme } from '../../Core/PanelTheme';
import { ThemeToggle } from './ThemeToggle';
import { aPanelHarness, click } from '../../PanelTestData';

const TO_DARK = 'Switch to the dark theme';
const TO_LIGHT = 'Switch to the light theme';

function stubSystemScheme(isDark: boolean) {
    const scheme = {
        matches: isDark,
        onChange: () => {},
    };
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
        get matches() {
            return scheme.matches;
        },
        addEventListener: (_type: string, listener: () => void) => {
            scheme.onChange = listener;
        },
    }) as unknown as MediaQueryList);

    return {
        change: (nextIsDark: boolean) => {
            scheme.matches = nextIsDark;
            scheme.onChange();
        },
    };
}

function build(theme: PanelTheme) {
    const harness = aPanelHarness({
        theme,
    });

    return {
        harness,
        toggle: new ThemeToggle(harness.context),
    };
}

describe('ThemeToggle', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('constructor_WhenTheThemeIsLight_ShouldOfferTheDarkTheme', () => {
        // Arrange
        stubSystemScheme(true);

        // Act
        const { toggle } = build(PANEL_THEMES.Light);

        // Assert
        expect(toggle.root.textContent).toBe('☾');
        expect(toggle.root.title).toBe(TO_DARK);
        expect(toggle.root.getAttribute('aria-label')).toBe(TO_DARK);
    });

    test('constructor_WhenTheThemeIsDark_ShouldOfferTheLightTheme', () => {
        // Arrange
        stubSystemScheme(false);

        // Act
        const { toggle } = build(PANEL_THEMES.Dark);

        // Assert
        expect(toggle.root.textContent).toBe('☀');
        expect(toggle.root.getAttribute('aria-label')).toBe(TO_LIGHT);
    });

    test('constructor_WhenFollowingADarkSystem_ShouldOfferTheLightTheme', () => {
        // Arrange
        stubSystemScheme(true);

        // Act
        const { toggle } = build(PANEL_THEMES.System);

        // Assert
        expect(toggle.root.getAttribute('aria-label')).toBe(TO_LIGHT);
    });

    test('click_WhenFollowingADarkSystem_ShouldSwitchToLight', () => {
        // Arrange
        stubSystemScheme(true);
        const { harness, toggle } = build(PANEL_THEMES.System);

        // Act
        click(toggle.root);

        // Assert
        expect(harness.store.getState().theme).toBe(PANEL_THEMES.Light);
        expect(toggle.root.getAttribute('aria-label')).toBe(TO_DARK);
    });

    test('click_WhenLight_ShouldSwitchToDark', () => {
        // Arrange
        stubSystemScheme(false);
        const { harness, toggle } = build(PANEL_THEMES.Light);

        // Act
        click(toggle.root);

        // Assert
        expect(harness.store.getState().theme).toBe(PANEL_THEMES.Dark);
    });

    test('watchSystem_WhenTheSystemSchemeChangesWhileFollowingIt_ShouldUpdateTheOffer', () => {
        // Arrange
        const system = stubSystemScheme(false);
        const { toggle } = build(PANEL_THEMES.System);

        // Act
        system.change(true);

        // Assert
        expect(toggle.root.getAttribute('aria-label')).toBe(TO_LIGHT);
    });

    test('watchSystem_WhenTheSystemSchemeChangesWithAnExplicitTheme_ShouldKeepTheOffer', () => {
        // Arrange
        const system = stubSystemScheme(false);
        const { toggle } = build(PANEL_THEMES.Light);

        // Act
        system.change(true);

        // Assert
        expect(toggle.root.getAttribute('aria-label')).toBe(TO_DARK);
    });
});
