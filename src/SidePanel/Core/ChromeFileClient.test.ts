import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeFileClient } from './ChromeFileClient';

function pickWith(files: File[]): void {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
        Object.defineProperty(
            /* o: */ this,
            /* p: */ 'files',
            /* attributes: */ {
                value: files,
            },
        );
        this.dispatchEvent(new Event(files.length === 0 ? 'cancel' : 'change'));
    });
}

describe('ChromeFileClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('pickNamedTextAsync_WhenAFileIsPicked_ShouldReturnItsNameAndText', async () => {
        // Arrange
        pickWith([new File(['{"log":{}}'], 'staging.har')]);

        // Act
        const picked = await new ChromeFileClient().pickNamedTextAsync('.har');

        // Assert
        expect(picked).toEqual({
            hasErrors: false,
            value: {
                name: 'staging.har',
                text: '{"log":{}}',
            },
        });
    });

    test('pickNamedTextAsync_WhenThePickIsCancelled_ShouldSucceedWithNoFile', async () => {
        // Arrange
        pickWith([]);

        // Act
        const picked = await new ChromeFileClient().pickNamedTextAsync('.har');

        // Assert
        expect(picked).toEqual({
            hasErrors: false,
            value: null,
        });
    });

    test('pickTextAsync_WhenAFileIsPicked_ShouldReturnOnlyItsText', async () => {
        // Arrange
        pickWith([new File(['hello'], 'notes.txt')]);

        // Act
        const picked = await new ChromeFileClient().pickTextAsync('.txt');

        // Assert
        expect(picked).toEqual({
            hasErrors: false,
            value: 'hello',
        });
    });
});
