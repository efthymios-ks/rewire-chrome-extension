import { afterEach, describe, expect, test, vi } from 'vitest';
import { VIEW_ID } from '../../Core/ViewId';
import { AppShell } from './AppShell';
import { VIEW_DEFINITIONS } from './ViewDefinitions';
import { aPanelHarness, click } from '../../PanelTestData';

function viewsOf(shell: AppShell): HTMLElement[] {
    return [...shell.root.querySelectorAll<HTMLElement>('main > section')];
}

function visibleViewLabels(shell: AppShell): string[] {
    return viewsOf(shell)
        .filter(view => !view.hidden)
        .map(view => view.getAttribute('aria-label') ?? '');
}

function noticeOf(shell: AppShell): HTMLElement {
    return shell.root.querySelector<HTMLElement>('[role="status"].notice')!;
}

function noticeActionOf(shell: AppShell): HTMLButtonElement {
    return noticeOf(shell).querySelector('button')!;
}

describe('AppShell', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('constructor_WhenBuilt_ShouldOfferASkipLinkToTheMainContent', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const shell = new AppShell(harness.context);

        // Assert
        const skipLink = shell.root.querySelector('a');
        expect(skipLink?.textContent).toBe('Skip to main content');
        expect(skipLink?.getAttribute('href')).toBe('#main-content');
        expect(shell.root.querySelector('main')?.id).toBe('main-content');
    });

    test('constructor_WhenBuilt_ShouldHostALabelledSectionPerView', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const shell = new AppShell(harness.context);

        // Assert
        expect(viewsOf(shell).map(view => view.getAttribute('aria-label')))
            .toEqual(VIEW_DEFINITIONS.map(definition => definition.label));
    });

    test('constructor_WhenBuilt_ShouldShowOnlyTheActiveView', () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: VIEW_ID.Traffic,
        });

        // Act
        const shell = new AppShell(harness.context);

        // Assert
        expect(visibleViewLabels(shell)).toEqual(['Traffic']);
    });

    test('select_WhenTheActiveViewChanges_ShouldSwitchTheVisibleView', () => {
        // Arrange
        const harness = aPanelHarness();
        const shell = new AppShell(harness.context);

        // Act
        harness.store.update(state => ({
            ...state,
            activeView: VIEW_ID.Jwt,
        }));

        // Assert
        expect(visibleViewLabels(shell)).toEqual(['JWT']);
    });

    test('constructor_WhenThereIsNoNotice_ShouldHideTheNotice', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const shell = new AppShell(harness.context);

        // Assert
        expect(noticeOf(shell).hidden).toBe(true);
    });

    test('select_WhenANoticeWithoutActionIsShown_ShouldShowOnlyTheMessage', () => {
        // Arrange
        vi.useFakeTimers();
        const harness = aPanelHarness();
        const shell = new AppShell(harness.context);

        // Act
        harness.context.notifier.show('Copied.');

        // Assert
        expect(noticeOf(shell).hidden).toBe(false);
        expect(noticeOf(shell).querySelector('.notice-text')?.textContent).toBe('Copied.');
        expect(noticeActionOf(shell).hidden).toBe(true);
    });

    test('select_WhenANoticeWithAnActionIsShown_ShouldOfferTheAction', () => {
        // Arrange
        vi.useFakeTimers();
        const harness = aPanelHarness();
        const shell = new AppShell(harness.context);

        // Act
        harness.context.notifier.show(
            /* message: */ 'Rule removed.',
            /* action: */ {
                label: 'Undo',
                run: vi.fn(),
            },
        );

        // Assert
        expect(noticeActionOf(shell).hidden).toBe(false);
        expect(noticeActionOf(shell).textContent).toBe('Undo');
    });

    test('click_WhenTheNoticeActionIsPressed_ShouldRunItAndDismissTheNotice', () => {
        // Arrange
        vi.useFakeTimers();
        const harness = aPanelHarness();
        const shell = new AppShell(harness.context);
        const run = vi.fn();
        harness.context.notifier.show(
            /* message: */ 'Rule removed.',
            /* action: */ {
                label: 'Undo',
                run,
            },
        );

        // Act
        click(noticeActionOf(shell));

        // Assert
        expect(run).toHaveBeenCalledOnce();
        expect(harness.store.getState().notice).toBeNull();
        expect(noticeOf(shell).hidden).toBe(true);
    });
});
