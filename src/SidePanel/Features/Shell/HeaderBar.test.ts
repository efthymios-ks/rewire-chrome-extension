import { describe, expect, test, vi } from 'vitest';
import { INSPECTION_STATE, type InspectionState } from '../../../Contracts/Inspection/InspectionState';
import type { InspectedTab } from '../../Core/InspectedTab';
import { HeaderBar } from './HeaderBar';
import { aSettings } from '../../../TestData';
import { aPanelHarness, buttonNamed, click } from '../../PanelTestData';

function aTab(overrides: Partial<InspectedTab> = {}): InspectedTab {
    return {
        tabId: 7,
        url: 'https://shop.example.com/cart',
        title: 'Cart',
        ...overrides,
    };
}

function hostOf(header: HeaderBar): HTMLElement {
    return header.root.querySelector<HTMLElement>('.header-host')!;
}

function statusPillOf(header: HeaderBar): HTMLElement {
    return header.root.querySelector<HTMLElement>('.status-pill')!;
}

function interceptionSwitchOf(header: HeaderBar): HTMLInputElement {
    return header.root.querySelector<HTMLInputElement>('[role="switch"]')!;
}

function inspecting(state: InspectionState, message = '') {
    return {
        inspection: {
            state,
            message,
        },
    };
}

describe('HeaderBar', () => {
    test('constructor_WhenBuilt_ShouldShowTheBrandProfileThemeAndInterceptionControls', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const header = new HeaderBar(harness.context);

        // Assert
        expect(header.root.querySelector('h1')?.textContent).toBe('Rewire');
        expect(header.root.querySelector('select[aria-label="Profile"]')).not.toBeNull();
        expect(header.root.querySelector('.theme-toggle')).not.toBeNull();
        expect(interceptionSwitchOf(header).closest('label')?.textContent).toBe('Interception');
    });

    test('constructor_WhenNoTabIsInspected_ShouldSayNoTab', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const header = new HeaderBar(harness.context);

        // Assert
        expect(hostOf(header).textContent).toBe('No tab');
        expect(hostOf(header).title).toBe('');
    });

    test('constructor_WhenATabIsInspected_ShouldShowItsHostWithTheUrlAsTitle', () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: aTab(),
        });

        // Act
        const header = new HeaderBar(harness.context);

        // Assert
        expect(hostOf(header).textContent).toBe('shop.example.com');
        expect(hostOf(header).title).toBe('https://shop.example.com/cart');
    });

    test('constructor_WhenTheUrlHasNoHost_ShouldShowTheTitle', () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: aTab({
                url: 'about:blank',
                title: 'New Tab',
            }),
        });

        // Act
        const header = new HeaderBar(harness.context);

        // Assert
        expect(hostOf(header).textContent).toBe('New Tab');
    });

    test('constructor_WhenTheUrlHasNoHostAndNoTitle_ShouldSayThisTab', () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: aTab({
                url: '',
                title: '',
            }),
        });

        // Act
        const header = new HeaderBar(harness.context);

        // Assert
        expect(hostOf(header).textContent).toBe('This tab');
    });

    test.each([
        [
            INSPECTION_STATE.Idle,
            'No tab',
            true,
        ],
        [
            INSPECTION_STATE.Attaching,
            'Attaching',
            true,
        ],
        [
            INSPECTION_STATE.Attached,
            'Capturing',
            true,
        ],
        [
            INSPECTION_STATE.Detached,
            'Detached',
            false,
        ],
        [
            INSPECTION_STATE.Failed,
            'Failed',
            false,
        ],
    ])('select_WhenTheInspectionStateIs%s_ShouldShowItsStatusAndReattachOnlyWhenLost', (
        state,
        label,
        isReattachHidden,
    ) => {
        // Arrange
        const harness = aPanelHarness();
        const header = new HeaderBar(harness.context);

        // Act
        harness.store.update(current => ({
            ...current,
            ...inspecting(state, 'Debugger detached by the user.'),
        }));

        // Assert
        expect(statusPillOf(header).textContent).toBe(label);
        expect(statusPillOf(header).dataset.state).toBe(String(state));
        expect(statusPillOf(header).title).toBe('Debugger detached by the user.');
        expect(buttonNamed(header.root, 'Reattach').hidden).toBe(isReattachHidden);
    });

    test('click_WhenReattachIsPressed_ShouldInspectTheTabAgain', () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: aTab(),
            ...inspecting(INSPECTION_STATE.Detached),
        });
        const reinspectAsync = vi.spyOn(harness.context.timelineSync, 'reinspectAsync').mockResolvedValue();
        const header = new HeaderBar(harness.context);

        // Act
        click(buttonNamed(header.root, 'Reattach'));

        // Assert
        expect(reinspectAsync).toHaveBeenCalledOnce();
    });

    test('constructor_WhenInterceptionIsOn_ShouldMarkTheHeaderOn', () => {
        // Arrange
        const harness = aPanelHarness({
            settings: aSettings({
                interceptionEnabled: true,
            }),
        });

        // Act
        const header = new HeaderBar(harness.context);

        // Assert
        expect(interceptionSwitchOf(header).checked).toBe(true);
        expect(header.root.dataset.interception).toBe('on');
    });

    test('change_WhenTheInterceptionSwitchIsTurnedOff_ShouldSaveAndMarkTheHeaderOff', () => {
        // Arrange
        const harness = aPanelHarness({
            settings: aSettings({
                interceptionEnabled: true,
            }),
        });
        const header = new HeaderBar(harness.context);
        const input = interceptionSwitchOf(header);

        // Act
        input.checked = false;
        input.dispatchEvent(new Event('change'));

        // Assert
        expect(harness.store.getState().settings.interceptionEnabled).toBe(false);
        expect(header.root.dataset.interception).toBe('off');
    });

    test('select_WhenInterceptionIsTurnedOnElsewhere_ShouldCheckTheSwitch', () => {
        // Arrange
        const harness = aPanelHarness({
            settings: aSettings({
                interceptionEnabled: false,
            }),
        });
        const header = new HeaderBar(harness.context);

        // Act
        harness.store.update(state => ({
            ...state,
            settings: {
                ...state.settings,
                interceptionEnabled: true,
            },
        }));

        // Assert
        expect(interceptionSwitchOf(header).checked).toBe(true);
        expect(header.root.dataset.interception).toBe('on');
    });
});
