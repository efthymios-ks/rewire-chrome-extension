import { afterEach, describe, expect, test, vi } from 'vitest';
import { PanelStateFactory } from './PanelStateFactory';
import { PANEL_THEMES } from './PanelTheme';
import { Store } from './Store';
import { ThemeApplier } from './ThemeApplier';
import { ThemeStorage } from './ThemeStorage';

function prefersDark(isDark: boolean): void {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: isDark,
        addEventListener: vi.fn(),
    } as unknown as MediaQueryList);
}

describe('ThemeApplier', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
        delete document.documentElement.dataset.theme;
    });

    test('start_WhenNoThemeIsSavedAndSystemPrefersDark_ShouldApplyDark', () => {
        // Arrange
        prefersDark(true);
        const store = new Store(PanelStateFactory.initial());

        // Act
        ThemeApplier.start(store);

        // Assert
        expect(document.documentElement.dataset.theme).toBe(PANEL_THEMES.Dark);
    });

    test('start_WhenNoThemeIsSavedAndSystemPrefersLight_ShouldApplyLight', () => {
        // Arrange
        prefersDark(false);
        const store = new Store(PanelStateFactory.initial());

        // Act
        ThemeApplier.start(store);

        // Assert
        expect(document.documentElement.dataset.theme).toBe(PANEL_THEMES.Light);
    });

    test('start_WhenAThemeWasSaved_ShouldRestoreAndApplyIt', () => {
        // Arrange
        prefersDark(false);
        ThemeStorage.save(PANEL_THEMES.Dark);
        const store = new Store(PanelStateFactory.initial());

        // Act
        ThemeApplier.start(store);

        // Assert
        expect(store.getState().theme).toBe(PANEL_THEMES.Dark);
        expect(document.documentElement.dataset.theme).toBe(PANEL_THEMES.Dark);
    });

    test('start_WhenTheThemeChanges_ShouldSaveAndApplyIt', () => {
        // Arrange
        prefersDark(true);
        const store = new Store(PanelStateFactory.initial());
        ThemeApplier.start(store);

        // Act
        store.update(state => ({
            ...state,
            theme: PANEL_THEMES.Light,
        }));

        // Assert
        expect(ThemeStorage.load()).toBe(PANEL_THEMES.Light);
        expect(document.documentElement.dataset.theme).toBe(PANEL_THEMES.Light);
    });
});
