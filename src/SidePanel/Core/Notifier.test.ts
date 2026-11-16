import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Notifier } from './Notifier';
import { PANEL_LIMITS } from './PanelLimits';
import { PanelStateFactory } from './PanelStateFactory';
import { Store } from './Store';

function setUp() {
    const store = new Store(PanelStateFactory.initial());

    return {
        store,
        notifier: new Notifier(store),
    };
}

describe('Notifier', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('show_WhenAMessageIsGiven_ShouldPublishTheNotice', () => {
        // Arrange
        const { store, notifier } = setUp();

        // Act
        notifier.show('Copied.');

        // Assert
        expect(store.getState().notice).toEqual({
            message: 'Copied.',
            action: null,
        });
    });

    test('show_WhenThereIsNoAction_ShouldDismissAfterTheNoticeDuration', () => {
        // Arrange
        const { store, notifier } = setUp();
        notifier.show('Copied.');

        // Act
        vi.advanceTimersByTime(PANEL_LIMITS.NoticeDurationInMilliseconds - 1);
        const noticeBefore = store.getState().notice;
        vi.advanceTimersByTime(1);

        // Assert
        expect(noticeBefore).not.toBeNull();
        expect(store.getState().notice).toBeNull();
    });

    test('show_WhenThereIsAnAction_ShouldStayForTheUndoDuration', () => {
        // Arrange
        const { store, notifier } = setUp();
        const action = {
            label: 'Undo',
            run: vi.fn(),
        };
        notifier.show('Rule removed.', action);

        // Act
        vi.advanceTimersByTime(PANEL_LIMITS.UndoDurationInMilliseconds - 1);
        const noticeBefore = store.getState().notice;
        vi.advanceTimersByTime(1);

        // Assert
        expect(noticeBefore?.action).toBe(action);
        expect(store.getState().notice).toBeNull();
    });

    test('show_WhenANewNoticeReplacesAnOld_ShouldRestartTheTimer', () => {
        // Arrange
        const { store, notifier } = setUp();
        notifier.show('First.');
        vi.advanceTimersByTime(PANEL_LIMITS.NoticeDurationInMilliseconds - 1);

        // Act
        notifier.show('Second.');
        vi.advanceTimersByTime(PANEL_LIMITS.NoticeDurationInMilliseconds - 1);

        // Assert
        expect(store.getState().notice?.message).toBe('Second.');
    });

    test('dismiss_WhenANoticeIsShown_ShouldClearIt', () => {
        // Arrange
        const { store, notifier } = setUp();
        notifier.show('Copied.');

        // Act
        notifier.dismiss();

        // Assert
        expect(store.getState().notice).toBeNull();
    });
});
