import { afterEach, describe, expect, test } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { buttonNamed, click } from '../../PanelTestData';

const ARGS = Object.freeze({
    title: 'Clear the timeline?',
    message: 'Every captured request will be removed.',
    confirmText: 'Clear',
});

function openDialog(): HTMLDialogElement {
    const dialog = document.querySelector('dialog');
    if (dialog == null) {
        throw new Error('No dialog is open.');
    }

    return dialog;
}

describe('ConfirmDialog', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('askAsync_WhenAsked_ShouldShowTheQuestionAndFocusCancel', () => {
        // Arrange
        const args = ARGS;

        // Act
        void ConfirmDialog.askAsync(args);

        // Assert
        const dialog = openDialog();
        expect(dialog.open).toBe(true);
        expect(dialog.querySelector('h2')?.textContent).toBe('Clear the timeline?');
        expect(dialog.querySelector('p')?.textContent).toBe('Every captured request will be removed.');
        expect(document.activeElement).toBe(buttonNamed(dialog, 'Cancel'));
    });

    test('askAsync_WhenConfirmed_ShouldResolveTrueAndRemoveTheDialog', async () => {
        // Arrange
        const answer = ConfirmDialog.askAsync(ARGS);

        // Act
        click(buttonNamed(openDialog(), 'Clear'));

        // Assert
        expect(await answer).toBe(true);
        expect(document.querySelector('dialog')).toBeNull();
    });

    test('askAsync_WhenCancelled_ShouldResolveFalseAndRemoveTheDialog', async () => {
        // Arrange
        const answer = ConfirmDialog.askAsync(ARGS);

        // Act
        click(buttonNamed(openDialog(), 'Cancel'));

        // Assert
        expect(await answer).toBe(false);
        expect(document.querySelector('dialog')).toBeNull();
    });

    test('askAsync_WhenEscapeCancelsTheDialog_ShouldResolveFalse', async () => {
        // Arrange
        const answer = ConfirmDialog.askAsync(ARGS);
        const cancelEvent = new Event('cancel', {
            cancelable: true,
        });

        // Act
        openDialog().dispatchEvent(cancelEvent);

        // Assert
        expect(await answer).toBe(false);
        expect(cancelEvent.defaultPrevented).toBe(true);
        expect(document.querySelector('dialog')).toBeNull();
    });

    test('askAsync_WhenAnsweredTwice_ShouldKeepTheFirstAnswer', async () => {
        // Arrange
        const answer = ConfirmDialog.askAsync(ARGS);
        const dialog = openDialog();
        const cancel = buttonNamed(dialog, 'Cancel');

        // Act
        click(buttonNamed(dialog, 'Clear'));
        click(cancel);

        // Assert
        expect(await answer).toBe(true);
    });
});
